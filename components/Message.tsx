
import React from 'react';
import { Debater, Message as MessageType } from '../types';
import { PodiumIcon } from './icons/PodiumIcon';

interface MessageProps {
  message: MessageType;
  isSpeaking: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isSpeaking }) => {
  const isAlpha = message.author === Debater.Alpha;

  const bubbleClasses = isAlpha
    ? 'bg-stone-800'
    : 'bg-slate-800';
  
  const containerClasses = isAlpha ? 'justify-start' : 'justify-end';
  const authorClasses = isAlpha ? 'text-amber-400 font-serif' : 'text-stone-300 font-serif';
  const iconClasses = isAlpha ? 'text-amber-500' : 'text-slate-400';
  const flexDirection = isAlpha ? 'flex-row' : 'flex-row-reverse';
  const speakingClasses = isSpeaking ? (isAlpha ? 'speaking-alpha' : 'speaking-beta') : '';

  const Icon = PodiumIcon;

  return (
    <div className={`flex items-start gap-3 w-full ${containerClasses}`}>
      <div className={`flex items-end gap-3 max-w-xl ${flexDirection}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-stone-900/50 ${iconClasses}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
           <span className={`text-sm font-bold mb-1 ${authorClasses} ${isAlpha ? 'text-left' : 'text-right'}`}>{message.author}</span>
           <div className={`relative p-4 rounded-2xl transition-shadow duration-300 ${bubbleClasses} ${speakingClasses}`}>
             <p className="text-base whitespace-pre-wrap text-gray-200">{message.text}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Message;
