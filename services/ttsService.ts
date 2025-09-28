
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// Fix: Infer the LiveSession type as it's not directly exported from the library.
type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

export class MicrophonePermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MicrophonePermissionError';
    }
}

// Base64 and audio decoding/encoding utilities
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface UtteranceJob {
    text: string;
    voiceName: string;
    onStart: () => void;
    onEnd: () => void;
}

class GeminiTTSService {
    private ai: GoogleGenAI;
    private outputAudioContext: AudioContext;
    private utteranceQueue: UtteranceJob[] = [];
    private currentSession: LiveSession | null = null;
    private sources = new Set<AudioBufferSourceNode>();
    private nextStartTime = 0;
    private microphoneStream: MediaStream | null = null;
    private isInitializingMic = false;

    public onStateChange: (state: { isSpeaking: boolean, isPaused: boolean }) => void = () => {};
    public onError: (error: Error) => void = () => {};

    constructor() {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    private async initializeMicrophone(): Promise<void> {
        if (this.microphoneStream) return;
        if (this.isInitializingMic) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.initializeMicrophone();
        }

        this.isInitializingMic = true;
        try {
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            console.error("Microphone access is required for AI voices to work.", error);
            throw new MicrophonePermissionError("Microphone permission was denied. This is required for text-to-speech functionality.");
        } finally {
            this.isInitializingMic = false;
        }
    }

    private updateState() {
        const isSpeaking = this.isBusy();
        const isPaused = this.outputAudioContext.state === 'suspended';
        this.onStateChange({ isSpeaking, isPaused });
    }

    public isBusy(): boolean {
        return this.utteranceQueue.length > 0 || this.sources.size > 0 || !!this.currentSession;
    }
    
    public speak(job: UtteranceJob) {
        if (this.outputAudioContext.state === 'suspended') {
            this.outputAudioContext.resume().catch(e => console.error("Error resuming AudioContext", e));
        }
        this.utteranceQueue.push(job);
        if (!this.currentSession) {
            this.processQueue();
        }
    }

    private async processQueue() {
        if (this.currentSession || this.utteranceQueue.length === 0) {
            return;
        }

        try {
            await this.initializeMicrophone();
        } catch (error) {
            console.error("TTS failed due to microphone initialization.", error);
            if (error instanceof MicrophonePermissionError) {
                this.onError(error);
            }
            this.utteranceQueue = []; // Clear queue on critical error
            this.updateState();
            return;
        }


        const job = this.utteranceQueue.shift();
        if (!job) return;

        job.onStart();
        this.updateState();

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        let audioSource: MediaStreamAudioSourceNode | null = null;
        let audioProcessor: ScriptProcessorNode | null = null;

        try {
            const sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!this.microphoneStream) return;
                        audioSource = inputAudioContext.createMediaStreamSource(this.microphoneStream);
                        audioProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

                        audioProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                // Mute the audio by sending zeros
                                int16[i] = 0;
                            }
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => {
                                if (this.currentSession === session) {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                }
                            });
                        };
                        audioSource.connect(audioProcessor);
                        audioProcessor.connect(inputAudioContext.destination);

                        sessionPromise.then(session => {
                            session.sendRealtimeInput({ text: job.text });
                        }).catch(e => console.error("Error sending realtime input:", e));
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
                            const source = this.outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(this.outputAudioContext.destination);
                            source.addEventListener('ended', () => {
                                this.sources.delete(source);
                                this.updateState();
                            });
                            source.start(this.nextStartTime);
                            this.nextStartTime += audioBuffer.duration;
                            this.sources.add(source);
                        }

                        if (message.serverContent?.turnComplete) {
                           sessionPromise.then(session => session.close()).catch(e => console.error("Error closing session:", e));
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Gemini Live API Error:', e);
                        audioSource?.disconnect();
                        audioProcessor?.disconnect();
                        inputAudioContext.close().catch(e => console.error("Error closing input audio context:", e));
                        job.onEnd();
                        this.currentSession = null;
                        this.updateState();
                        this.processQueue();
                    },
                    onclose: () => {
                        audioSource?.disconnect();
                        audioProcessor?.disconnect();
                        inputAudioContext.close().catch(e => console.error("Error closing input audio context:", e));

                        const timeToWait = (this.nextStartTime - this.outputAudioContext.currentTime) * 1000;
                        setTimeout(() => {
                           job.onEnd();
                           this.currentSession = null;
                           this.updateState();
                           this.processQueue();
                        }, Math.max(0, timeToWait) + 100);
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: job.voiceName } },
                    },
                    systemInstruction: 'You are a text-to-speech engine. When you receive text input, you must read it back verbatim, in a clear and natural voice. Do not add any other words or commentary.',
                },
            });
            this.currentSession = await sessionPromise;
        } catch (error) {
            console.error("Failed to connect to Gemini Live API:", error);
            job.onEnd();
            this.updateState();
            inputAudioContext.close().catch(e => console.error("Error closing input audio context:", e));
            this.processQueue();
        }
    }

    public pause() {
        if (this.outputAudioContext.state === 'running') {
            this.outputAudioContext.suspend().then(() => this.updateState());
        }
    }

    public resume() {
        if (this.outputAudioContext.state === 'suspended') {
            this.outputAudioContext.resume().then(() => this.updateState());
        }
    }

    public cancel() {
        this.utteranceQueue = [];
        
        this.sources.forEach(source => {
            try {
                source.stop();
            } catch(e) {
                console.warn("Error stopping audio source:", e);
            }
        });
        this.sources.clear();
        this.nextStartTime = 0;

        if (this.currentSession) {
            this.currentSession.close();
            this.currentSession = null;
        }
        
        this.updateState();
    }
}

export const ttsService = new GeminiTTSService();
