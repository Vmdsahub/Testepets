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
  const { isPlaying, currentTrack, volume, setVolume, togglePlayPause } =
    useMusicContext();

  return (
    <div className="p-4 h-full flex flex-col gap-2">
      {/* Main Content Row - Centered */}
      <div className="flex items-center justify-center gap-6 flex-1">
        {/* Cover Image - Much Larger */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg flex-shrink-0">
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
        </div>

        {/* Track Info - Next to image */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-base mb-1 truncate">
            {currentTrack?.name || "Música Galáctica"}
          </h4>
          <p className="text-sm text-gray-500">XenoPets</p>
        </div>
      </div>

      {/* Controls Row - Bottom */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0" />

        <button
          onClick={togglePlayPause}
          className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 p-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <div
          className="flex-1 relative"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-full h-1.5 bg-gray-200 rounded-full">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 pointer-events-none"
              style={{
                width: `${volume * 100}%`,
                boxShadow: `0 0 6px rgba(59, 130, 246, 1), 0 0 12px rgba(59, 130, 246, 0.7)`,
                filter: "brightness(1.2)",
              }}
            ></div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              e.stopPropagation();
              setVolume(Number(e.target.value));
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onDragStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            style={{ touchAction: "none" }}
          />
        </div>

        <span className="text-xs text-blue-700 font-medium w-7 text-center flex-shrink-0">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
