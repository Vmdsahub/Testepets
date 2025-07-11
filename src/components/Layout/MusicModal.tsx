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
  const {
    isPlaying,
    currentTrack,
    isLoading,
    volume,
    setVolume,
    togglePlayPause,
    nextTrack,
    previousTrack,
  } = useMusicContext();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MusicIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Player de Música</h3>
          <p className="text-sm text-gray-600">
            Olá, {user?.username || "Jogador"}!
          </p>
        </div>
      </div>

      {/* Music Player Content */}
      <div className="px-2">
        {/* Track Info */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center">
            <MusicIcon className="w-8 h-8 text-white" />
          </div>
          <h4 className="font-medium text-gray-900 mb-1">
            {currentTrack?.name || "Música Galáctica"}
          </h4>
          <p className="text-sm text-gray-600">XenoPets Soundtrack</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <motion.button
            onClick={previousTrack}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8.445 14.832A1 1 0 0 0 10 14v-2.798l5.445 3.63A1 1 0 0 0 17 14V6a1 1 0 0 0-1.555-.832L10 8.798V6a1 1 0 0 0-1.555-.832l-6 4a1 1 0 0 0 0 1.664l6 4z" />
            </svg>
          </motion.button>

          <motion.button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </motion.button>

          <motion.button
            onClick={nextTrack}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M4.555 5.168A1 1 0 0 0 3 6v8a1 1 0 0 0 1.555.832L10 11.202V14a1 1 0 0 0 1.555.832l6-4a1 1 0 0 0 0-1.664l-6-4A1 1 0 0 0 10 6v2.798L4.555 5.168z" />
            </svg>
          </motion.button>
        </div>

        {/* Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Volume</span>
            <span className="text-sm text-gray-500">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-600" />
            )}
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
