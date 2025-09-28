import React from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import StopIcon from './icons/StopIcon';

interface PlaybackControlsProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isDebateFinished: boolean;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isSpeaking,
  isPaused,
  onPlay,
  onPause,
  onResume,
  onStop,
  isDebateFinished
}) => {
  const showPlayButton = isDebateFinished && !isSpeaking && !isPaused;

  if (!isDebateFinished) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {showPlayButton && (
        <button
          onClick={onPlay}
          className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-slate-900 font-semibold rounded-lg hover:bg-amber-600 transition"
          aria-label="Play debate audio"
        >
          <PlayIcon className="w-5 h-5" />
          Play Audio
        </button>
      )}

      {isSpeaking && !isPaused && (
        <button
          onClick={onPause}
          className="flex items-center gap-2 px-4 py-2 bg-stone-600 text-white font-semibold rounded-lg hover:bg-stone-500 transition"
          aria-label="Pause debate audio"
        >
          <PauseIcon className="w-5 h-5" />
          Pause
        </button>
      )}

      {isPaused && (
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-slate-900 font-semibold rounded-lg hover:bg-amber-600 transition"
          aria-label="Resume debate audio"
        >
          <PlayIcon className="w-5 h-5" />
          Resume
        </button>
      )}

      {(isSpeaking || isPaused) && (
        <button
          onClick={onStop}
          className="flex items-center gap-2 px-4 py-2 bg-rose-900 text-white font-semibold rounded-lg hover:bg-rose-800 transition"
          aria-label="Stop debate audio"
        >
          <StopIcon className="w-5 h-5" />
          Stop
        </button>
      )}
    </div>
  );
};

export default PlaybackControls;