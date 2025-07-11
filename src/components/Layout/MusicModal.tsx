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
    <div className="flex flex-col h-full p-4">
      {/* Cover Image - Compact */}
      <div className="flex items-center justify-center mb-4">
        <div className="w-24 h-24 rounded-2xl shadow-lg relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
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
          {isPlaying && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Track Info - Compact */}
      <div className="text-center mb-4">
        <h4 className="font-semibold text-gray-900 text-base leading-tight mb-1 truncate">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
        <p className="text-xs text-gray-500">XenoPets</p>
      </div>

      {/* Play/Pause Control - Compact */}
      <div className="flex justify-center mb-4">
        <motion.button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </motion.button>
      </div>

      {/* Volume Control - Compact */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Volume</span>
          <span className="text-xs text-blue-600 font-semibold">
            {Math.round(volume * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          {volume === 0 ? (
            <VolumeX className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          )}
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-luminous"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #60a5fa ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div
              className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full pointer-events-none transition-all duration-200"
              style={{
                width: `${volume * 100}%`,
                boxShadow: `0 0 8px rgba(59, 130, 246, ${volume * 0.6})`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
