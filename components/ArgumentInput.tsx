
import React, { useState } from 'react';

interface ArgumentInputProps {
  onSubmit: (argument: string) => void;
  isThinking: boolean;
}

const ArgumentInput: React.FC<ArgumentInputProps> = ({ onSubmit, isThinking }) => {
  const [argument, setArgument] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (argument.trim() && !isThinking) {
      onSubmit(argument.trim());
      setArgument('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-start gap-3">
      <textarea
        value={argument}
        onChange={(e) => setArgument(e.target.value)}
        placeholder="Enter your argument..."
        disabled={isThinking}
        className="flex-1 p-3 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50 resize-none"
        rows={3}
        onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmit(e);
            }
        }}
      />
      <button
        type="submit"
        disabled={isThinking || !argument.trim()}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
};

export default ArgumentInput;
