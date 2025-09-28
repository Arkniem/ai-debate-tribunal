
import { GoogleGenAI } from '@google/genai';

// Base64 and audio decoding/encoding utilities
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
  // This assumes the data is raw PCM 16-bit signed integers.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize from [-32768, 32767] to [-1, 1]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface PlaybackJob {
    audioBuffer: AudioBuffer;
    onStart: () => void;
    onEnd: () => void;
}

class GeminiTTSService {
    private ai: GoogleGenAI;
    private outputAudioContext: AudioContext;
    private playbackQueue: PlaybackJob[] = [];
    private sources = new Set<AudioBufferSourceNode>();
    private isPlaying = false;
    private currentJob: PlaybackJob | null = null;

    constructor() {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    public async generateAudio(text: string, voiceName: string): Promise<AudioBuffer | null> {
        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName },
                        },
                    },
                },
            });

            const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (data) {
                const audioBytes = decode(data);
                return await decodeAudioData(audioBytes, this.outputAudioContext, 24000, 1);
            } else {
                console.error("TTS API returned no audio data.");
                return null;
            }
        } catch (error) {
            console.error("Error generating TTS content:", error);
            return null;
        }
    }

    public play(job: PlaybackJob) {
        if (this.outputAudioContext.state === 'suspended') {
            this.outputAudioContext.resume().catch(e => console.error("Error resuming AudioContext", e));
        }
        this.playbackQueue.push(job);
        if (!this.isPlaying) {
            this.processPlaybackQueue();
        }
    }

    private async processPlaybackQueue() {
        if (this.isPlaying || this.playbackQueue.length === 0) {
            return;
        }
        this.isPlaying = true;

        this.currentJob = this.playbackQueue.shift();
        if (!this.currentJob) {
            this.isPlaying = false;
            return;
        }

        const job = this.currentJob;
        job.onStart();

        try {
            if (this.outputAudioContext.state === 'suspended') {
                await this.outputAudioContext.resume();
            }

            const source = this.outputAudioContext.createBufferSource();
            source.buffer = job.audioBuffer;
            source.connect(this.outputAudioContext.destination);

            source.onended = () => {
                this.sources.delete(source);
                if (this.currentJob === job) {
                    job.onEnd();
                    this.currentJob = null;
                    this.isPlaying = false;
                    this.processPlaybackQueue();
                }
            };
            
            this.sources.add(source);
            source.start();
        } catch (error) {
            console.error("Error playing audio:", error);
            job.onEnd();
            this.currentJob = null;
            this.isPlaying = false;
            this.processPlaybackQueue();
        }
    }

    public cancel() {
        this.playbackQueue = [];
        this.sources.forEach(source => {
            try {
                source.onended = null;
                source.stop();
            } catch(e) {
                console.warn("Error stopping audio source:", e);
            }
        });
        this.sources.clear();
        
        if (this.currentJob) {
            this.currentJob.onEnd();
            this.currentJob = null;
        }

        this.isPlaying = false;
    }
}

export const ttsService = new GeminiTTSService();
