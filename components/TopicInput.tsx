import React, { useState } from 'react';

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  isDebating: boolean;
}

const TopicInput: React.FC<TopicInputProps> = ({ onSubmit, isDebating }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isDebating) {
      onSubmit(topic.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-3">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a debate topic, e.g., 'Cats are better than dogs'"
        disabled={isDebating}
        className="flex-1 p-3 bg-stone-900/70 text-white rounded-lg border-2 border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isDebating || !topic.trim()}
        className="px-6 py-3 bg-amber-700 text-slate-900 font-semibold rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Debate
      </button>
    </form>
  );
};

export default TopicInput;