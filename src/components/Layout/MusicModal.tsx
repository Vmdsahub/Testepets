import React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music as MusicIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { useMusicContext } from "../../contexts/MusicContext";

export const MusicModal: React.FC = () => {
  const { user } = useGameStore();
  const { isPlaying, currentTrack, volume, setVolume, play, pause } =
    useMusicContext();

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Cover Image */}
      <div className="flex justify-center mb-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 shadow-md">
          {currentTrack?.coverImage ? (
            <img
              src={currentTrack.coverImage}
              alt={currentTrack.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MusicIcon className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Track Name */}
      <div className="text-center mb-3">
        <h4 className="font-medium text-gray-900 text-sm truncate">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
      </div>

      {/* Play/Pause Button */}
      <div className="flex justify-center mb-4">
        <motion.button
          onClick={togglePlayPause}
          className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </motion.button>
      </div>

      {/* Volume Bar */}
      <div className="mt-auto">
        <div className="flex items-center gap-2">
          <Volume2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <div className="flex-1 relative">
            <div className="w-full h-1 bg-gray-200 rounded-full">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{
                  width: `${volume * 100}%`,
                  boxShadow: `0 0 6px rgba(59, 130, 246, 0.8)`,
                }}
              ></div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
