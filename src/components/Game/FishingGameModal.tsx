import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Award, Trophy, Fish } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import WaterShaders from "./WaterShaders";

interface Fish {
  id: string;
  x: number;
  y: number;
  speed: number;
  direction: number;
  name: string;
  points: number;
  size: number;
}

interface CaughtFish {
  id: string;
  name: string;
  points: number;
}

interface FishingGameModalProps {
  onClose: () => void;
}

export const FishingGameModal: React.FC<FishingGameModalProps> = ({
  onClose,
}) => {
  const { addXenocoins } = useGameStore();

  // Game state
  const [fish, setFish] = useState<Fish | null>(null);
  const [hookPosition, setHookPosition] = useState({ x: 50, y: 100 });

  const [isLaunching, setIsLaunching] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [caughtFishes, setCaughtFishes] = useState<CaughtFish[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [showCatch, setShowCatch] = useState<CaughtFish | null>(null);

  // Refs
  const gameContainer = useRef<HTMLDivElement>(null);

  // Water dimensions state for responsive WebGL
  const [waterDimensions, setWaterDimensions] = useState({
    width: 600,
    height: 400,
  });

  // Generate the single fish
  const generateFish = useCallback((): Fish => {
    return {
      id: "mystical-fish",
      x: Math.random() * 70 + 15, // Keep fish in visible area
      y: 30 + Math.random() * 40, // Fish swim in water area
      speed: 0.03 + Math.random() * 0.05,
      direction: Math.random() > 0.5 ? 1 : -1,
      name: "Peixe Místico dos Anciões",
      points: 100,
      size: 2.5,
    };
  }, []);

  // Initialize fish
  useEffect(() => {
    setFish(generateFish());
  }, [generateFish]);

  // Game loop for fish movement
  useEffect(() => {
    const gameLoop = () => {
      setFish((prevFish) => {
        if (!prevFish) return null;

        let newX = prevFish.x + prevFish.speed * prevFish.direction * 0.5;
        let newDirection = prevFish.direction;

        // Reverse direction if fish reaches boundaries
        if (newX > 85 || newX < 15) {
          newDirection = -prevFish.direction;
          newX = Math.max(15, Math.min(85, newX));
        }

        return {
          ...prevFish,
          x: newX,
          direction: newDirection,
        };
      });
    };

    const interval = setInterval(gameLoop, 50);
    return () => clearInterval(interval);
  }, []);

  // Respawn fish after it's caught
  useEffect(() => {
    if (!fish) {
      const timeout = setTimeout(() => {
        setFish(generateFish());
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [fish, generateFish]);

  // Game timer
  useEffect(() => {
    const timer = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle window resize for responsive WebGL water
  useEffect(() => {
    const handleResize = () => {
      if (gameContainer.current) {
        const rect = gameContainer.current.getBoundingClientRect();
        setWaterDimensions({
          width: rect.width,
          height: rect.height * 0.7, // Water takes 70% of container height
        });
      }
    };

    const observer = new ResizeObserver(handleResize);
    if (gameContainer.current) {
      observer.observe(gameContainer.current);
      handleResize(); // Set initial size
    }

    return () => observer.disconnect();
  }, []);

  // Handle fishing launch
  const handleWaterClick = useCallback(
    (event: React.MouseEvent) => {
      if (isLaunching || isRetracting || isFishing) return;

      const rect = gameContainer.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // Only allow fishing in water area (bottom 70%)
      if (y < 30) return;

      setTargetPosition({ x, y });
      setIsLaunching(true);
      setHookPosition({ x, y });

      // After launch animation completes
      setTimeout(() => {
        setIsLaunching(false);
        setIsFishing(true);

        // Check for fish catch after hook settles
        setTimeout(() => {
          if (!fish) {
            setIsFishing(false);
            startRetraction();
            return;
          }

          const distance = Math.sqrt(
            Math.pow(fish.x - x, 2) + Math.pow(fish.y - y, 2),
          );

          if (distance < 12) {
            // Fish caught!
            const newCatch: CaughtFish = {
              id: fish.id,
              name: fish.name,
              points: fish.points,
            };

            setCaughtFishes((prev) => [...prev, newCatch]);
            setTotalScore((prev) => prev + fish.points);
            setShowCatch(newCatch);
            addXenocoins(Math.floor(fish.points / 5));

            // Remove the fish
            setFish(null);

            // Hide catch notification after 2 seconds
            setTimeout(() => setShowCatch(null), 2000);
          }

          setIsFishing(false);
          setTimeout(() => {
            startRetraction();
          }, 1000);
        }, 2000);
      }, 1200);
    },
    [isLaunching, isRetracting, isFishing, fish, addXenocoins],
  );

  const startRetraction = () => {
    setIsRetracting(true);
    setTimeout(() => {
      setHookPosition({ x: 50, y: 100 });
      setTargetPosition({ x: 50, y: 50 });
      setIsRetracting(false);
    }, 600);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Fish className="w-6 h-6" />
            <h2 className="text-xl font-bold">Templo dos Anciões - Pesca</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Game Stats Bar */}
        <div className="bg-gray-50 border-b p-3 flex justify-between items-center text-sm">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">⏱️ Tempo:</span>
              <span className="font-medium">{formatTime(gameTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">🏆 Pontos:</span>
              <span className="font-medium text-yellow-600">{totalScore}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">🎣 Peixes:</span>
              <span className="font-medium text-blue-600">
                {caughtFishes.length}
              </span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative bg-gradient-to-b from-sky-200 to-blue-400">
          <div
            ref={gameContainer}
            className="absolute inset-0 cursor-crosshair"
            onClick={handleWaterClick}
          >
            {/* Sky Area */}
            <div className="absolute top-0 left-0 w-full h-[30%] overflow-hidden">
              <motion.div
                className="absolute top-4 left-10 text-4xl opacity-60"
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 10, repeat: Infinity }}
              >
                ☁️
              </motion.div>
              <motion.div
                className="absolute top-8 right-20 text-3xl opacity-50"
                animate={{ x: [0, -15, 0] }}
                transition={{ duration: 12, repeat: Infinity }}
              >
                ☁️
              </motion.div>
            </div>

            {/* Water Surface Line */}
            <div className="absolute top-[30%] left-0 w-full h-px">
              <motion.div
                className="w-full h-px bg-gradient-to-r from-blue-200 via-white to-blue-200 opacity-70"
                animate={{ scaleX: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>

            {/* WebGL Water Area */}
            <div className="absolute top-[30%] left-0 w-full h-[70%]">
              <WaterShaders
                width={waterDimensions.width}
                height={waterDimensions.height}
                className="absolute inset-0 w-full h-full"
              />

              {/* Fish */}
              {fish && (
                <motion.div
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: `${fish.x}%`,
                    top: `${fish.y - 30}%`, // Adjust for water area offset
                    transform: fish.direction > 0 ? "scaleX(1)" : "scaleX(-1)",
                  }}
                  animate={{
                    y: [0, -4, 0],
                    rotate: [0, fish.direction * 1, 0],
                  }}
                  transition={{
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2Fce46587856fe4a08b8f584f94123bade%2Fb2f6ea722aff420ab4d228a5ff95d846?format=webp&width=800"
                    alt="Peixe Místico"
                    className="w-16 h-16 object-contain drop-shadow-lg"
                    style={{
                      filter: "drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))",
                    }}
                  />
                </motion.div>
              )}
            </div>

            {/* Fishing Rod */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-20 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-full z-20" />

            {/* Fishing Line */}
            {(isLaunching || isRetracting || isFishing) && (
              <svg
                className="absolute inset-0 w-full h-full z-15 pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <motion.line
                  x1="50"
                  y1="95"
                  x2={hookPosition.x}
                  y2={hookPosition.y}
                  stroke="#374151"
                  strokeWidth="0.5"
                  initial={{ pathLength: 0 }}
                  animate={{
                    pathLength: isLaunching
                      ? [0, 1]
                      : isRetracting
                        ? [1, 0]
                        : 1,
                  }}
                  transition={{
                    duration: isLaunching ? 1.2 : isRetracting ? 0.8 : 0,
                    ease: isLaunching ? "easeOut" : "easeIn",
                  }}
                />
              </svg>
            )}

            {/* Hook */}
            <motion.div
              className="absolute z-25 text-2xl pointer-events-none"
              initial={{
                left: "50%",
                top: "95%",
              }}
              animate={{
                left:
                  isLaunching || isRetracting || isFishing
                    ? `${hookPosition.x}%`
                    : "50%",
                top:
                  isLaunching || isRetracting || isFishing
                    ? `${hookPosition.y}%`
                    : "95%",
                rotate: isFishing ? [0, 8, -8, 0] : 0,
                y: isFishing ? [0, -3, 3, 0] : 0,
              }}
              transition={{
                left: {
                  duration: isLaunching ? 1.2 : isRetracting ? 0.8 : 0,
                  ease: isLaunching ? "easeOut" : "easeIn",
                },
                top: {
                  duration: isLaunching ? 1.2 : isRetracting ? 0.8 : 0,
                  ease: isLaunching ? "easeOut" : "easeIn",
                },
                rotate: {
                  duration: 2.5,
                  ease: "easeInOut",
                  repeat: isFishing ? Infinity : 0,
                },
                y: {
                  duration: 2.5,
                  ease: "easeInOut",
                  repeat: isFishing ? Infinity : 0,
                },
              }}
              style={{
                transform: "translate(-50%, -50%)",
              }}
            >
              🪝
            </motion.div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 right-4 z-30">
            <div className="bg-black/30 backdrop-blur text-white p-3 rounded-lg text-sm text-center">
              {isLaunching ? (
                <div className="animate-pulse">🎣 Lançando anzol...</div>
              ) : isFishing ? (
                <div className="animate-pulse">🎣 Pescando... Aguarde!</div>
              ) : isRetracting ? (
                <div className="animate-pulse">↩️ Recolhendo linha...</div>
              ) : (
                <div>Clique na água para lançar o anzol! 🌊</div>
              )}
            </div>
          </div>
        </div>

        {/* Catch Notification */}
        <AnimatePresence>
          {showCatch && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="bg-white rounded-xl shadow-xl p-6 text-center border-4 border-yellow-400">
                <div className="text-6xl mb-2">🎣</div>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {showCatch.name}
                </div>
                <div className="text-lg text-yellow-600 font-semibold flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />+{showCatch.points} pontos
                </div>
                <div className="text-sm text-green-600 mt-2">
                  +{Math.floor(showCatch.points / 5)} Xenocoins
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Caught Fish Sidebar */}
        {caughtFishes.length > 0 && (
          <div className="absolute right-4 top-20 bottom-4 w-48 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 overflow-y-auto z-30">
            <h3 className="font-bold text-center mb-3 flex items-center justify-center gap-2">
              <Award className="w-4 h-4" />
              Capturas
            </h3>
            <div className="space-y-2">
              {caughtFishes.map((fish, index) => (
                <div
                  key={`${fish.id}-${index}`}
                  className="p-2 rounded bg-blue-50 border border-blue-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src="https://cdn.builder.io/api/v1/image/assets%2Fce46587856fe4a08b8f584f94123bade%2Fb2f6ea722aff420ab4d228a5ff95d846?format=webp&width=800"
                      alt="Peixe Capturado"
                      className="w-8 h-8 object-contain"
                    />
                    <div>
                      <div className="font-semibold text-gray-800">
                        {fish.name}
                      </div>
                      <div className="text-yellow-600">+{fish.points}pts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
