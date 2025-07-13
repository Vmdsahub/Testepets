import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Award, Trophy } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

interface Fish {
  id: string;
  x: number;
  y: number;
  speed: number;
  direction: number;
  type: "common" | "rare" | "legendary";
  emoji: string;
  name: string;
  points: number;
  size: number;
}

interface CaughtFish {
  id: string;
  type: "common" | "rare" | "legendary";
  emoji: string;
  name: string;
  points: number;
}

const FISH_TYPES = {
  common: [
    { emoji: "🐟", name: "Peixe Comum", points: 10 },
    { emoji: "🐠", name: "Peixe Tropical", points: 15 },
    { emoji: "🎣", name: "Sardinha", points: 8 },
  ],
  rare: [
    { emoji: "🐡", name: "Baiacu Sagrado", points: 50 },
    { emoji: "🦈", name: "Tubarão Místico", points: 75 },
    { emoji: "🐙", name: "Polvo Ancestral", points: 60 },
  ],
  legendary: [
    { emoji: "🐋", name: "Baleia dos Anciões", points: 200 },
    { emoji: "🦑", name: "Kraken Dourado", points: 300 },
    { emoji: "🌊", name: "Espírito das Águas", points: 500 },
  ],
};

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen, addXenocoins } = useGameStore();

  // Game state
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [hookPosition, setHookPosition] = useState({ x: 50, y: 20 });
  const [lineLength, setLineLength] = useState(0);
  const [isHookInWater, setIsHookInWater] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [caughtFishes, setCaughtFishes] = useState<CaughtFish[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [showCatch, setShowCatch] = useState<CaughtFish | null>(null);

  // Refs
  const gameLoopRef = useRef<number>();
  const fishSpawnRef = useRef<NodeJS.Timeout>();
  const gameContainer = useRef<HTMLDivElement>(null);

  // Generate random fish
  const generateFish = useCallback((): Fish => {
    const typeRandom = Math.random();
    let type: "common" | "rare" | "legendary";

    if (typeRandom > 0.95) type = "legendary";
    else if (typeRandom > 0.8) type = "rare";
    else type = "common";

    const fishData =
      FISH_TYPES[type][Math.floor(Math.random() * FISH_TYPES[type].length)];

    return {
      id: Date.now() + Math.random().toString(),
      x: Math.random() > 0.5 ? -10 : 110,
      y: 40 + Math.random() * 50, // Fish swim in water area
      speed: 0.5 + Math.random() * 1.5,
      direction: Math.random() > 0.5 ? 1 : -1,
      type,
      emoji: fishData.emoji,
      name: fishData.name,
      points: fishData.points,
      size: type === "legendary" ? 3 : type === "rare" ? 2.5 : 2,
    };
  }, []);

  // Initialize fishes
  useEffect(() => {
    const initialFishes = Array.from({ length: 8 }, generateFish);
    setFishes(initialFishes);
  }, [generateFish]);

  // Game loop for fish movement
  useEffect(() => {
    const gameLoop = () => {
      setFishes((prevFishes) =>
        prevFishes.map((fish) => {
          let newX = fish.x + fish.speed * fish.direction;
          let newDirection = fish.direction;

          // Reverse direction if fish reaches boundaries
          if (newX > 100 || newX < 0) {
            newDirection = -fish.direction;
            newX = Math.max(0, Math.min(100, newX));
          }

          return {
            ...fish,
            x: newX,
            direction: newDirection,
          };
        }),
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Spawn new fish periodically
  useEffect(() => {
    fishSpawnRef.current = setInterval(() => {
      setFishes((prevFishes) => {
        if (prevFishes.length < 12) {
          return [...prevFishes, generateFish()];
        }
        return prevFishes;
      });
    }, 3000);

    return () => {
      if (fishSpawnRef.current) {
        clearInterval(fishSpawnRef.current);
      }
    };
  }, [generateFish]);

  // Game timer
  useEffect(() => {
    const timer = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle hook movement and fishing
  const handleScreenClick = useCallback(
    (event: React.MouseEvent) => {
      if (isFishing) return;

      const rect = gameContainer.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      setHookPosition({ x, y: Math.max(20, y) });

      // If clicking in water area, start fishing
      if (y > 35) {
        setIsFishing(true);
        setIsHookInWater(true);
        setLineLength(y - 20);

        // Check for fish catch after a delay
        setTimeout(() => {
          const hookX = x;
          const hookY = y;

          // Check if hook is near any fish
          const caughtFish = fishes.find((fish) => {
            const distance = Math.sqrt(
              Math.pow(fish.x - hookX, 2) + Math.pow(fish.y - hookY, 2),
            );
            return distance < 8; // Catch radius
          });

          if (caughtFish) {
            // Remove caught fish from the water
            setFishes((prev) => prev.filter((f) => f.id !== caughtFish.id));

            // Add to caught fishes
            const newCatch: CaughtFish = {
              id: caughtFish.id,
              type: caughtFish.type,
              emoji: caughtFish.emoji,
              name: caughtFish.name,
              points: caughtFish.points,
            };

            setCaughtFishes((prev) => [...prev, newCatch]);
            setTotalScore((prev) => prev + caughtFish.points);
            setShowCatch(newCatch);
            addXenocoins(Math.floor(caughtFish.points / 5));

            // Hide catch notification after 2 seconds
            setTimeout(() => setShowCatch(null), 2000);
          }

          // Reset fishing state
          setTimeout(() => {
            setIsFishing(false);
            setIsHookInWater(false);
            setLineLength(0);
            setHookPosition({ x: 50, y: 20 });
          }, 1000);
        }, 1500);
      }
    },
    [isFishing, fishes, addXenocoins],
  );

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

      {/* Water Area with animated waves */}
      <div className="absolute top-1/3 left-0 w-full h-2/3 overflow-hidden">
        {/* Animated water background */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 30%, rgba(34, 197, 94, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 40% 80%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)
            `,
          }}
          animate={{
            background: [
              `radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
               radial-gradient(ellipse at 80% 30%, rgba(34, 197, 94, 0.2) 0%, transparent 50%),
               radial-gradient(ellipse at 40% 80%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)`,
              `radial-gradient(ellipse at 30% 40%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
               radial-gradient(ellipse at 70% 60%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
               radial-gradient(ellipse at 50% 70%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)`,
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Water bubbles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -40, -20],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Fish */}
        {fishes.map((fish) => (
          <motion.div
            key={fish.id}
            className="absolute text-center pointer-events-none"
            style={{
              left: `${fish.x}%`,
              top: `${fish.y}%`,
              fontSize: `${fish.size}rem`,
              transform: fish.direction > 0 ? "scaleX(-1)" : "scaleX(1)",
            }}
            animate={{
              y: [0, -5, 0],
              rotate: [0, fish.direction * 2, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
            }}
          >
            {fish.emoji}
          </motion.div>
        ))}
      </div>

      {/* Fishing Line */}
      {lineLength > 0 && (
        <div
          className="absolute bg-gray-800 z-10"
          style={{
            left: `${hookPosition.x}%`,
            top: "20%",
            width: "2px",
            height: `${lineLength}%`,
            transformOrigin: "top",
          }}
        />
      )}

      {/* Fishing Hook */}
      <motion.div
        className="absolute z-20 text-2xl pointer-events-none"
        style={{
          left: `${hookPosition.x}%`,
          top: `${hookPosition.y}%`,
          transform: "translate(-50%, -50%)",
        }}
        animate={isFishing ? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.5, repeat: isFishing ? Infinity : 0 }}
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
          {isFishing ? (
            <div className="animate-pulse">🎣 Pescando... Aguarde!</div>
          ) : (
            <div>Clique na água para pescar! 🌊</div>
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
              <div className="text-6xl mb-2">{showCatch.emoji}</div>
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

      {/* Caught Fish Collection (Side Panel) */}
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
                className={`p-2 rounded text-white text-xs ${
                  fish.type === "legendary"
                    ? "bg-yellow-600/50"
                    : fish.type === "rare"
                      ? "bg-purple-600/50"
                      : "bg-blue-600/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{fish.emoji}</span>
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
