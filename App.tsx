import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Debater, Message } from './types';
import { getAIResponse } from './services/geminiService';
import { ttsService, MicrophonePermissionError } from './services/ttsService';
import TopicInput from './components/TopicInput';
import DebateView from './components/DebateView';
import ScalesIcon from './components/icons/ScalesIcon';

// High-quality voices for the AI Debaters.
const AI_ALPHA_VOICE = 'Zephyr';
const AI_BETA_VOICE = 'Puck';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [debateHistory, setDebateHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [isDebateFinished, setIsDebateFinished] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState<number | null>(null);
  
  const isDebatingRef = useRef(isDebating);

  useEffect(() => {
    isDebatingRef.current = isDebating;
  }, [isDebating]);

  useEffect(() => {
    const handleError = (error: Error) => {
        if (error instanceof MicrophonePermissionError) {
            setError("Microphone access is required for AI voices. Please grant permission and try again.");
            handleStopDebate();
        }
    }
    
    ttsService.onError = handleError;

    return () => {
      ttsService.cancel();
      ttsService.onError = () => {};
    };
  }, []);

  const speakMessage = useCallback((message: Message, index: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!isDebatingRef.current) {
        resolve();
        return;
      }
      
      const voiceName = message.author === Debater.Alpha ? AI_ALPHA_VOICE : AI_BETA_VOICE;

      setCurrentlySpeakingIndex(index);
      ttsService.speak({
        text: message.text,
        voiceName,
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

    const history: Message[] = [];
    let currentDebater = Debater.Alpha;
    let nextResponsePromise: Promise<string> | null = null;

    try {
      while (isDebatingRef.current) {
        setIsLoading(true);
        
        const currentResponseText = nextResponsePromise
          ? await nextResponsePromise
          : await getAIResponse(newTopic, currentDebater, history);

        if (!isDebatingRef.current) break;
        
        const newMessage: Message = { author: currentDebater, text: currentResponseText };
        history.push(newMessage);
        setDebateHistory([...history]);
        setIsLoading(false);

        if (currentResponseText.trim().toLowerCase().startsWith('i concede')) {
          break;
        }
        
        const nextDebater = (currentDebater === Debater.Alpha) ? Debater.Beta : Debater.Alpha;
        nextResponsePromise = getAIResponse(newTopic, nextDebater, history);
        
        await speakMessage(newMessage, history.length - 1);
        
        if (!isDebatingRef.current) break;

        currentDebater = nextDebater;
      }
    } catch (e) {
      setError(`An error occurred during the debate. Please try again.`);
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsDebateFinished(true);
      setIsDebating(false);
      setCurrentlySpeakingIndex(null);
    }
  }, [speakMessage]);
  
  useEffect(() => {
    if (isDebating && topic) {
      runDebate(topic);
    }
  }, [isDebating, topic, runDebate]);


  const handleStartDebate = useCallback((newTopic: string) => {
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

        <DebateView messages={debateHistory} isLoading={isLoading} currentlySpeakingIndex={currentlySpeakingIndex}/>
        
      </main>
    </div>
  );
};

export default App;
