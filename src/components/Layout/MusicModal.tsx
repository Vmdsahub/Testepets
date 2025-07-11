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
    <div className="p-6 h-full flex flex-col justify-center items-center">
      {/* Cover Image */}
      <div className="w-32 h-32 bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
        <MusicIcon className="w-16 h-16 text-white" />
      </div>

      {/* Track Info */}
      <div className="text-center mb-8">
        <h4 className="font-semibold text-gray-900 mb-1 text-lg">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
        <p className="text-sm text-gray-600">XenoPets Soundtrack</p>
        <p className="text-xs text-gray-500 mt-2">
          Olá, {user?.username || "Jogador"}!
        </p>
      </div>

      {/* Play/Pause Control */}
      <div className="mb-8">
        <motion.button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isLoading ? (
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </motion.button>
      </div>

      {/* Volume Control */}
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Volume</span>
          <span className="text-sm text-blue-600 font-semibold">
            {Math.round(volume * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-blue-600" />
          )}
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #60a5fa ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
                boxShadow: `0 0 10px rgba(59, 130, 246, ${volume * 0.5})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
