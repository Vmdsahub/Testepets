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
      {/* Large Cover Image */}
      <div className="flex justify-center mb-3">
        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg">
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
              <MusicIcon className="w-12 h-12 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Track Name */}
      <div className="text-center mb-4">
        <h4 className="font-medium text-gray-900 text-sm truncate px-2">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
      </div>

      {/* Controls Row: Volume icon + Play button + Volume bar */}
      <div className="mt-auto">
        <div className="flex items-center gap-3">
          {/* Volume Icon */}
          <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0" />

          {/* Minimalist Play Button */}
          <motion.button
            onClick={togglePlayPause}
            className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 text-white" />
            ) : (
              <Play className="w-3 h-3 text-white ml-0.5" />
            )}
          </motion.button>

          {/* Super Luminous Volume Bar */}
          <div className="flex-1 relative h-4 flex items-center">
            <div className="w-full h-2 bg-gray-200 rounded-full shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-300"
                style={{
                  width: `${volume * 100}%`,
                  boxShadow: `
                    0 0 8px rgba(59, 130, 246, 1),
                    0 0 16px rgba(59, 130, 246, 0.8),
                    0 0 24px rgba(59, 130, 246, 0.6),
                    inset 0 1px 2px rgba(255, 255, 255, 0.3)
                  `,
                  filter: "brightness(1.3) saturate(1.2)",
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

          {/* Volume Percentage */}
          <span className="text-xs text-blue-700 font-semibold w-8 text-center">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
