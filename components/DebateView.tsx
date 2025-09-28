
import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '../types';
import Message from './Message';

interface DebateViewProps {
  messages: MessageType[];
  isLoading: boolean;
  currentlySpeakingIndex: number | null;
}

const TypingIndicator: React.FC = () => (
    <div className="flex justify-start items-center p-4">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-stone-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-stone-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-stone-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  );

const DebateView: React.FC<DebateViewProps> = ({ messages, isLoading, currentlySpeakingIndex }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div 
      ref={scrollRef} 
      className="flex-1 w-full p-6 space-y-6 overflow-y-auto bg-black/30 rounded-lg"
    >
      {messages.map((msg, index) => (
        <Message 
          key={index} 
          message={msg} 
          isSpeaking={index === currentlySpeakingIndex}
        />
      ))}
      {isLoading && <TypingIndicator />}
    </div>
  );
};

export default DebateView;
