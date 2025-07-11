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
    <div className="p-6">
      {/* Cover Image */}
      <div className="text-center mb-4">
        <div className="w-24 h-24 mx-auto rounded-2xl shadow-lg relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
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

        {/* Track Info */}
        <h4 className="font-semibold text-gray-900 text-base mt-3 mb-1">
          {currentTrack?.name || "Música Galáctica"}
        </h4>
        <p className="text-xs text-gray-500">XenoPets</p>
      </div>

      {/* Play/Pause Control */}
      <div className="text-center mb-6">
        <motion.button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg flex items-center justify-center mx-auto"
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

      {/* VOLUME BAR - SUPER VISIBLE */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">VOLUME</span>
          <span className="text-sm text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-gray-500" />
          ) : (
            <Volume2 className="w-5 h-5 text-blue-600" />
          )}

          <div className="flex-1 relative">
            <div className="w-full h-3 bg-white border border-gray-300 rounded-full shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 shadow-lg"
                style={{
                  width: `${volume * 100}%`,
                  boxShadow: `0 0 12px rgba(59, 130, 246, 0.8), inset 0 1px 2px rgba(255,255,255,0.3)`,
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
              style={{ height: "12px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
