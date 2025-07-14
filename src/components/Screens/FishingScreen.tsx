import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Award, Trophy } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import WaterShaders from "../Game/WaterShaders";

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

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen, addXenocoins } = useGameStore();

  // Game state
  const [fish, setFish] = useState<Fish | null>(null);
  const [hookPosition, setHookPosition] = useState({ x: 50, y: 100 });
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [isLaunching, setIsLaunching] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [caughtFishes, setCaughtFishes] = useState<CaughtFish[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [showCatch, setShowCatch] = useState<CaughtFish | null>(null);
  const [lineLength, setLineLength] = useState(0);
  const [hookAngle, setHookAngle] = useState(0);

  // Refs
  const gameLoopRef = useRef<number>();
  const fishSpawnRef = useRef<NodeJS.Timeout>();
  const gameContainer = useRef<HTMLDivElement>(null);

  // Water dimensions state for responsive WebGL
  const [waterDimensions, setWaterDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? (window.innerHeight * 2) / 3 : 640,
  });

  // Generate the single fish
  const generateFish = useCallback((): Fish => {
    return {
      id: "mystical-fish",
      x: Math.random() * 80 + 10, // Keep fish in visible area
      y: 45 + Math.random() * 35, // Fish swim in water area
      speed: 0.05 + Math.random() * 0.1,
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

  // Game loop for fish movement (slower, time-based)
  useEffect(() => {
    const gameLoop = () => {
      setFish((prevFish) => {
        if (!prevFish) return null;

        // Movimento mais lento baseado em tempo
        let newX = prevFish.x + prevFish.speed * prevFish.direction * 0.5; // Reduzir ainda mais
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

    // Usar intervalo em vez de requestAnimationFrame para controle mais preciso
    const interval = setInterval(gameLoop, 50); // 20fps em vez de 60fps

    return () => {
      clearInterval(interval);
    };
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
      setWaterDimensions({
        width: window.innerWidth,
        height: (window.innerHeight * 2) / 3,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate line length and angle
  useEffect(() => {
    const deltaX = targetPosition.x - 50;
    const deltaY = targetPosition.y - 100;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);

    setLineLength(length);
    setHookAngle(angle);
  }, [targetPosition]);

  // Handle fishing launch
  const handleScreenClick = useCallback(
    (event: React.MouseEvent) => {
      if (isLaunching || isRetracting || isFishing) return;

      const rect = gameContainer.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // Only allow fishing in water area
      if (y < 35) return;

      setTargetPosition({ x, y });
      setIsLaunching(true);

      // Start launch animation - immediate hook position update
      setHookPosition({ x, y });

      // After launch animation completes
      setTimeout(() => {
        setIsLaunching(false);
        setIsFishing(true);

        // Check for fish catch after hook settles
        setTimeout(() => {
          if (!fish) {
            // No fish to catch, start retracting
            setIsFishing(false);
            startRetraction();
            return;
          }

          const hookX = x;
          const hookY = y;

          // Check if hook is near the fish
          const distance = Math.sqrt(
            Math.pow(fish.x - hookX, 2) + Math.pow(fish.y - hookY, 2),
          );

          if (distance < 12) {
            // Catch radius
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

          // Always retract after fishing attempt
          setIsFishing(false);
          setTimeout(() => {
            startRetraction();
          }, 1000);
        }, 2000);
      }, 1200); // Extended hook travel time for smooth animation
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
    <div
      ref={gameContainer}
      className="w-full h-screen relative overflow-hidden cursor-crosshair select-none"
      onClick={handleScreenClick}
      style={{
        background: `
          linear-gradient(180deg, 
            #1e40af 0%,
            #3b82f6 20%,
            #0ea5e9 35%,
            #0284c7 50%,
            #0369a1 75%,
            #1e3a8a 100%
          )
        `,
      }}
    >
      {/* Sky and Clouds */}
      <div className="absolute top-0 left-0 w-full h-1/3 overflow-hidden">
        <motion.div
          className="absolute top-4 left-10 text-white text-6xl opacity-60"
          animate={{ x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute top-8 right-20 text-white text-4xl opacity-50"
          animate={{ x: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        >
          ☁️
        </motion.div>
      </div>

      {/* Water Surface */}
      <div className="absolute top-1/3 left-0 w-full h-px">
        <motion.div
          className="w-full h-px bg-gradient-to-r from-blue-200 via-white to-blue-200 opacity-70"
          animate={{ scaleX: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* WebGL Water Shaders */}
      <div className="absolute top-1/3 left-0 w-full h-2/3 overflow-hidden">
        <WaterShaders
          width={typeof window !== "undefined" ? window.innerWidth : 1920}
          height={
            typeof window !== "undefined" ? (window.innerHeight * 2) / 3 : 640
          }
          className="absolute inset-0 w-full h-full"
        />

        {/* Single Mystical Fish */}
        {fish && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: `${fish.x}%`,
              top: `${fish.y}%`,
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
              className="w-20 h-20 object-contain drop-shadow-lg"
              style={{
                filter: "drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))",
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Fishing Rod (bottom of screen) */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-32 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-full z-10" />

      {/* Fishing Line - Simple and Visible */}
      {(isLaunching || isRetracting || isFishing) && (
        <svg
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.line
            x1="50"
            y1="87"
            x2={hookPosition.x}
            y2={hookPosition.y}
            stroke="#374151"
            strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: isLaunching ? [0, 1] : isRetracting ? [1, 0] : 1,
            }}
            transition={{
              duration: isLaunching ? 1.2 : isRetracting ? 0.8 : 0,
              ease: isLaunching ? "easeOut" : "easeIn",
            }}
          />
        </svg>
      )}

      {/* Dynamic Fishing Hook */}
      <motion.div
        className="absolute z-20 text-3xl pointer-events-none"
        initial={{
          left: "50%",
          top: "calc(100% - 128px)",
        }}
        animate={{
          left:
            isLaunching || isRetracting || isFishing
              ? `${hookPosition.x}%`
              : "50%",
          top:
            isLaunching || isRetracting || isFishing
              ? `${hookPosition.y}%`
              : "calc(100% - 128px)",
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

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30">
        {/* Back button */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentScreen("exploration");
          }}
          className="bg-white/20 backdrop-blur text-white p-3 rounded-lg hover:bg-white/30 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>

        {/* Game Stats */}
        <div className="bg-black/30 backdrop-blur text-white p-4 rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Templo dos Anciões</h2>
          <div className="text-sm space-y-1">
            <div>⏱️ {formatTime(gameTime)}</div>
            <div>🏆 {totalScore} pontos</div>
            <div>🎣 {caughtFishes.length} peixes</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 text-center z-30">
        <div className="bg-black/30 backdrop-blur text-white p-3 rounded-lg text-sm">
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

      {/* Catch Notification */}
      <AnimatePresence>
        {showCatch && (
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="bg-white rounded-xl shadow-xl p-6 text-center border-4 border-yellow-400">
              <div className="text-6xl mb-2">��</div>
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

      {/* Caught Fish Collection */}
      {caughtFishes.length > 0 && (
        <div className="absolute right-4 top-24 bottom-20 w-48 bg-black/30 backdrop-blur rounded-lg p-3 overflow-y-auto z-30">
          <h3 className="text-white font-bold text-center mb-3 flex items-center justify-center gap-2">
            <Award className="w-4 h-4" />
            Capturas
          </h3>
          <div className="space-y-2">
            {caughtFishes.map((fish, index) => (
              <div
                key={`${fish.id}-${index}`}
                className="p-2 rounded text-white text-xs bg-blue-600/50"
              >
                <div className="flex items-center gap-2">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2Fce46587856fe4a08b8f584f94123bade%2Fb2f6ea722aff420ab4d228a5ff95d846?format=webp&width=800"
                    alt="Peixe Capturado"
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <div className="font-semibold">{fish.name}</div>
                    <div className="text-yellow-300">+{fish.points}pts</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
