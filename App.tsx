
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Debater, Message } from './types';
import { getAIResponse } from './services/geminiService';
import { ttsService } from './services/ttsService';
import TopicInput from './components/TopicInput';
import DebateView from './components/DebateView';
import ScalesIcon from './components/icons/ScalesIcon';

// High-quality voices for the AI Debaters.
const AI_ALPHA_VOICE = 'Autonoe';
const AI_BETA_VOICE = 'Schedar';
const PRELOAD_TARGET_COUNT = 6; // 3 responses per debater

interface PreloadedResponse {
  message: Message;
  audioBuffer: AudioBuffer | null;
}

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [debateHistory, setDebateHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [isDebateFinished, setIsDebateFinished] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState<number | null>(null);
  
  const isDebatingRef = useRef(isDebating);
  const preloadedQueueRef = useRef<PreloadedResponse[]>([]);

  useEffect(() => {
    isDebatingRef.current = isDebating;
  }, [isDebating]);

  useEffect(() => {
    // Cleanup TTS service on component unmount
    return () => {
      ttsService.cancel();
    };
  }, []);

  const speakBuffer = useCallback((audioBuffer: AudioBuffer, index: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!isDebatingRef.current) {
        resolve();
        return;
      }
      
      setCurrentlySpeakingIndex(index);
      ttsService.play({
        audioBuffer,
        onStart: () => {},
        onEnd: () => {
          setCurrentlySpeakingIndex(null);
          resolve();
        },
      });
    });
  }, []);

  const runDebate = useCallback(async (newTopic: string) => {
    setIsLoading(true);
    setError(null);
    setDebateHistory([]);
    setIsDebateFinished(false);
    preloadedQueueRef.current = []; // Reset queue for new debate

    let tempHistory: Message[] = [];
    let activeGenerators = 0;

    const addToQueue = (response: PreloadedResponse) => {
      preloadedQueueRef.current.push(response);
    };

    const generateNextResponse = async () => {
      if (!isDebatingRef.current) return;
      
      activeGenerators++;
      try {
          const nextDebater = tempHistory.length % 2 === 0 ? Debater.Alpha : Debater.Beta;
          const text = await getAIResponse(newTopic, nextDebater, tempHistory);

          if (!isDebatingRef.current) return;

          const newMessage: Message = { author: nextDebater, text: text || "..." };
          tempHistory.push(newMessage);

          let audioBuffer: AudioBuffer | null = null;
          if (text && text.trim() !== '') {
              const voiceName = nextDebater === Debater.Alpha ? AI_ALPHA_VOICE : AI_BETA_VOICE;
              audioBuffer = await ttsService.generateAudio(text, voiceName);
          }
          
          if (isDebatingRef.current) {
              addToQueue({ message: newMessage, audioBuffer });
          }
      } catch (e) {
          console.error("Error generating response in queue", e);
          setError("An error occurred while generating a response.");
          isDebatingRef.current = false; // Stop the debate
      } finally {
          activeGenerators--;
      }
    };

    // --- Initial Preloading ---
    for (let i = 0; i < PRELOAD_TARGET_COUNT; i++) {
        await generateNextResponse();
        if (!isDebatingRef.current) break; // Stop if error or manual stop
        if (tempHistory.length > 0 && tempHistory[tempHistory.length - 1].text.toLowerCase().startsWith('i concede')) {
            break;
        }
    }
    setIsLoading(false);

    // --- Main Playback Loop ---
    let playbackIndex = 0;
    while (isDebatingRef.current) {
        if (preloadedQueueRef.current.length === 0) {
            if (activeGenerators > 0) {
                setIsLoading(true);
                await new Promise(r => setTimeout(r, 200));
                continue;
            } else {
                break; // Queue is empty and nothing is generating, so we're done
            }
        }
        setIsLoading(false);

        const currentResponse = preloadedQueueRef.current.shift();
        if (!currentResponse) continue;

        // Fire-and-forget the next generation
        if (!currentResponse.message.text.toLowerCase().startsWith('i concede')) {
            generateNextResponse();
        }

        // Display and speak the current response
        setDebateHistory(prev => [...prev, currentResponse.message]);
        
        if (currentResponse.audioBuffer) {
            await speakBuffer(currentResponse.audioBuffer, playbackIndex);
        }
        
        playbackIndex++;

        if (currentResponse.message.text.toLowerCase().startsWith('i concede')) {
            break; // End debate
        }
    }

    // --- Cleanup ---
    setIsLoading(false);
    setIsDebateFinished(true);
    setIsDebating(false);
    setCurrentlySpeakingIndex(null);
  }, [speakBuffer]);
  
  useEffect(() => {
    if (isDebating && topic) {
      runDebate(topic);
    }
  }, [isDebating, topic, runDebate]);


  const handleStartDebate = useCallback((newTopic: string) => {
    ttsService.resumeContext(); // Unlock audio for mobile browsers
    setTopic(newTopic);
    setIsDebating(true);
    setError(null);
    setIsDebateFinished(false);
  }, []);

  const handleStopDebate = () => {
    setIsDebating(false);
    ttsService.cancel();
  };

  const handleNewDebate = () => {
    ttsService.cancel();
    setTopic('');
    setDebateHistory([]);
    setIsDebateFinished(false);
    setIsLoading(false);
    setError(null);
    setCurrentlySpeakingIndex(null);
    setIsDebating(false);
  };

  return (
    <div className="flex flex-col h-screen text-gray-200 p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-amber-50 flex items-center justify-center gap-4 font-serif">
          <ScalesIcon className="w-10 h-10" />
          The AI Tribunal
        </h1>
        <p className="text-stone-400 mt-2">Where digital intellects argue matters of consequence.</p>
      </header>
      
      <main className="flex flex-col flex-1 max-w-4xl w-full mx-auto gap-4 min-h-0">
        {!isDebating && !isDebateFinished ? (
            <TopicInput onSubmit={handleStartDebate} isDebating={isDebating} />
        ) : null}

        {(isDebating || debateHistory.length > 0) && (
            <div className="p-4 bg-stone-900/50 rounded-lg w-full flex justify-between items-center gap-4">
                <div className="text-left">
                    <p className="text-stone-400">Debating Topic:</p>
                    <h2 className="text-xl font-semibold text-white font-serif">{topic}</h2>
                </div>
                {isDebating ? (
                     <button
                        onClick={handleStopDebate}
                        className="flex-shrink-0 px-6 py-2 bg-rose-900 text-white font-semibold rounded-lg hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-rose-500 transition"
                        aria-label="End the current debate"
                      >
                        End Debate
                      </button>
                ) : (
                    <button
                        onClick={handleNewDebate}
                        className="flex-shrink-0 px-6 py-2 bg-stone-600 text-white font-semibold rounded-lg hover:bg-stone-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-amber-500 transition"
                        >
                        New Debate
                    </button>
                )}
            </div>
        )}

        {error && <div className="text-rose-300 p-3 bg-rose-950/50 rounded-lg text-center">{error}</div>}

        <DebateView messages={debateHistory} isLoading={isLoading} currentlySpeakingIndex={currentlySpeakingIndex} />
        
      </main>
    </div>
  );
};

export default App;