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
    <div className="p-6 h-full flex flex-col justify-center items-center">
      {/* Cover Image */}
      <div className="w-40 h-40 rounded-3xl mb-6 shadow-2xl relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
        {currentTrack?.coverImage ? (
          <>
            <img
              src={currentTrack.coverImage}
              alt={currentTrack.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to gradient background
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20"></div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="w-full h-full flex items-center justify-center">
              <MusicIcon className="w-20 h-20 text-white z-10" />
            </div>
          </>
        )}
        {isPlaying && (
          <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center mb-8">
        <h4 className="font-bold text-gray-900 mb-2 text-xl">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
        <p className="text-sm text-gray-600 font-medium">XenoPets Soundtrack</p>
      </div>

      {/* Play/Pause Control */}
      <div className="mb-8">
        <motion.button
          onClick={togglePlayPause}
          className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isPlaying ? (
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
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer slider-luminous"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #3b82f6 ${volume * 50}%, #60a5fa ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
                }}
              />
              <div
                className="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full pointer-events-none transition-all duration-200"
                style={{
                  width: `${volume * 100}%`,
                  boxShadow: `0 0 20px rgba(59, 130, 246, ${volume * 0.8}), 0 0 40px rgba(59, 130, 246, ${volume * 0.4})`,
                  filter: `brightness(${1 + volume * 0.5})`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
