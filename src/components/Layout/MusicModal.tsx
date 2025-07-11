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
    <div className="p-4 space-y-4">
      {/* Cover Image */}
      <div className="flex items-center justify-center">
        <div className="w-20 h-20 rounded-xl shadow-lg relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
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
              <MusicIcon className="w-10 h-10 text-white" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="text-center">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
        <p className="text-xs text-gray-500">XenoPets</p>
      </div>

      {/* Play/Pause Control */}
      <div className="flex justify-center">
        <motion.button
          onClick={togglePlayPause}
          className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center"
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

      {/* Volume Control - GUARANTEED VISIBLE */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Volume</span>
          <span className="text-xs text-blue-600 font-bold">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-blue-600" />
            )}
          </div>

          <div className="flex-1 relative h-4 flex items-center">
            {/* Background track */}
            <div className="w-full h-2 bg-gray-300 rounded-full"></div>

            {/* Progress/volume fill with glow */}
            <div
              className="absolute left-0 h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-200"
              style={{
                width: `${volume * 100}%`,
                boxShadow: `0 0 8px rgba(59, 130, 246, 0.8)`,
                filter: "brightness(1.2)",
              }}
            ></div>

            {/* Invisible input overlay */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
