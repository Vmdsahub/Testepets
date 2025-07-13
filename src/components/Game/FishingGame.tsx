import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target } from "lucide-react";

interface Fish {
  id: string;
  name: string;
  imageUrl: string;
  rarity: "common" | "rare" | "legendary";
  speed: number; // Velocidade do movimento do peixe na barra
  size: number; // Tamanho da zona do peixe na barra (0-1)
}

interface FishingGameProps {
  onClose: () => void;
  onFishCaught: (fish: Fish) => void;
}

const FISH_DATA: Fish[] = [
  {
    id: "crystal-fish",
    name: "Peixe Cristalino",
    imageUrl:
      "https://cdn.builder.io/api/v1/image/assets%2F14397f3b3f9049c3ad3ca64e1b66afd5%2F3c3112f8a28e4b8d9b5a3ca4741db1d5?format=webp&width=800",
    rarity: "common",
    speed: 0.02,
    size: 0.15,
  },
];

export const FishingGame: React.FC<FishingGameProps> = ({
  onClose,
  onFishCaught,
}) => {
  const [gameState, setGameState] = useState<
    "idle" | "casting" | "waiting" | "fishing" | "success" | "failed"
  >("idle");
  const [fishPosition, setFishPosition] = useState(0.5); // Posição do peixe na barra (0-1)
  const [fishDirection, setFishDirection] = useState(1); // 1 para cima, -1 para baixo
  const [playerPosition, setPlayerPosition] = useState(0.1); // Posição da barra do jogador (0-1)
  const [tension, setTension] = useState(0.5); // Tensão da linha (0-1)
  const [progress, setProgress] = useState(0); // Progresso da captura (0-1)
  const [currentFish, setCurrentFish] = useState<Fish | null>(null);
  const [holdTime, setHoldTime] = useState(0);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const castingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constantes do jogo
  const PLAYER_BAR_HEIGHT = 0.2; // Altura da barra do jogador
  const TENSION_DECAY = 0.008; // Velocidade de redução da tensão
  const PROGRESS_RATE = 0.015; // Velocidade de ganho de progresso quando na zona
  const PROGRESS_LOSS = 0.02; // Velocidade de perda de progresso quando fora da zona

  // Iniciar o jogo de pesca
  const startFishing = useCallback(() => {
    setGameState("casting");
    setProgress(0);
    setTension(0.5);
    setPlayerPosition(0.1);

    // Simula o tempo de lançamento
    castingTimeoutRef.current = setTimeout(() => {
      setGameState("waiting");

      // Simula tempo de espera até um peixe morder
      const waitTime = Math.random() * 3000 + 2000; // 2-5 segundos
      waitingTimeoutRef.current = setTimeout(() => {
        // Escolhe um peixe aleatório
        const randomFish =
          FISH_DATA[Math.floor(Math.random() * FISH_DATA.length)];
        setCurrentFish(randomFish);
        setGameState("fishing");

        // Posição inicial aleatória do peixe
        setFishPosition(Math.random() * 0.8 + 0.1);
      }, waitTime);
    }, 1500);
  }, []);

  // Game loop para quando está pescando
  useEffect(() => {
    if (gameState === "fishing" && currentFish) {
      gameLoopRef.current = setInterval(() => {
        setFishPosition((prev) => {
          let newPos = prev + fishDirection * currentFish.speed;

          // Rebater nas bordas
          if (newPos <= 0) {
            setFishDirection(1);
            newPos = 0;
          } else if (newPos >= 1) {
            setFishDirection(-1);
            newPos = 1;
          }

          // Mudança aleatória de direção
          if (Math.random() < 0.02) {
            setFishDirection((prev) => -prev);
          }

          return newPos;
        });

        // Verificar se o jogador está na zona do peixe
        const fishZoneStart = fishPosition - currentFish.size / 2;
        const fishZoneEnd = fishPosition + currentFish.size / 2;
        const playerZoneStart = playerPosition;
        const playerZoneEnd = playerPosition + PLAYER_BAR_HEIGHT;

        const inZone = !(
          playerZoneEnd < fishZoneStart || playerZoneStart > fishZoneEnd
        );

        if (inZone) {
          setProgress((prev) => Math.min(1, prev + PROGRESS_RATE));
          setTension((prev) => Math.max(0, prev - TENSION_DECAY));
        } else {
          setProgress((prev) => Math.max(0, prev - PROGRESS_LOSS));
          setTension((prev) => Math.min(1, prev + TENSION_DECAY));
        }

        // Verificar condições de vitória/derrota
        setProgress((currentProgress) => {
          if (currentProgress >= 1) {
            setGameState("success");
            return 1;
          }
          return currentProgress;
        });

        setTension((currentTension) => {
          if (currentTension >= 1) {
            setGameState("failed");
            return 1;
          }
          return currentTension;
        });
      }, 16); // ~60 FPS
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, fishPosition, playerPosition, currentFish, fishDirection]);

  // Controle do jogador (segurar para subir)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && gameState === "fishing") {
        e.preventDefault();
        setHoldTime((prev) => prev + 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setHoldTime(0);
      }
    };

    const handleMouseDown = () => {
      if (gameState === "fishing") {
        setHoldTime((prev) => prev + 1);
      }
    };

    const handleMouseUp = () => {
      setHoldTime(0);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gameState]);

  // Atualizar posição do jogador baseado no hold time
  useEffect(() => {
    if (gameState === "fishing") {
      const interval = setInterval(() => {
        if (holdTime > 0) {
          setPlayerPosition((prev) => Math.max(0, prev - 0.02)); // Sobe quando segura
        } else {
          setPlayerPosition((prev) =>
            Math.min(1 - PLAYER_BAR_HEIGHT, prev + 0.015),
          ); // Desce quando solta
        }
      }, 16);

      return () => clearInterval(interval);
    }
  }, [gameState, holdTime]);

  // Limpar timeouts
  useEffect(() => {
    return () => {
      if (castingTimeoutRef.current) clearTimeout(castingTimeoutRef.current);
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  // Lidar com sucesso
  useEffect(() => {
    if (gameState === "success" && currentFish) {
      setTimeout(() => {
        onFishCaught(currentFish);
        onClose();
      }, 2000);
    }
  }, [gameState, currentFish, onFishCaught, onClose]);

  // Lidar com falha
  useEffect(() => {
    if (gameState === "failed") {
      setTimeout(() => {
        setGameState("idle");
        setCurrentFish(null);
      }, 2000);
    }
  }, [gameState]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-b from-sky-400 to-blue-800 rounded-xl shadow-2xl max-w-md w-full h-96 relative overflow-hidden"
        >
          {/* Background - Água com ondas */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300/30 to-blue-900/50">
            <div className="absolute inset-0 opacity-20">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-full h-2 bg-white/20 rounded-full"
                  style={{ top: `${20 + i * 15}%` }}
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 3 + i,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="relative z-10 p-4 bg-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                🎣 Pesca Ancestral
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Game Area */}
          <div className="relative z-10 flex-1 px-4 pb-4">
            {gameState === "idle" && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">🏛️</div>
                <h3 className="text-white text-xl font-bold mb-2">
                  Templo dos Anciões
                </h3>
                <p className="text-white/80 mb-6 text-sm">
                  As águas sagradas do templo escondem criaturas místicas.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startFishing}
                  className="bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors"
                >
                  <Target className="w-5 h-5 inline mr-2" />
                  Lançar Anzol
                </motion.button>
              </div>
            )}

            {gameState === "casting" && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="text-4xl mb-4"
                  >
                    🎣
                  </motion.div>
                  <p className="text-white">Lançando anzol...</p>
                </div>
              </div>
            )}

            {gameState === "waiting" && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-4xl mb-4"
                  >
                    🎣
                  </motion.div>
                  <p className="text-white">Aguardando um peixe...</p>
                </div>
              </div>
            )}

            {gameState === "fishing" && currentFish && (
              <div className="h-full relative">
                {/* Fishing Bar */}
                <div className="absolute right-4 top-4 bottom-4 w-8 bg-black/30 rounded-lg overflow-hidden">
                  {/* Zona do Peixe */}
                  <motion.div
                    className="absolute w-full bg-green-400/60 rounded"
                    style={{
                      height: `${currentFish.size * 100}%`,
                      top: `${(fishPosition - currentFish.size / 2) * 100}%`,
                    }}
                  />

                  {/* Barra do Jogador */}
                  <motion.div
                    className="absolute w-full bg-white border-2 border-black rounded"
                    style={{
                      height: `${PLAYER_BAR_HEIGHT * 100}%`,
                      top: `${playerPosition * 100}%`,
                    }}
                  />
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-4 left-4 right-16">
                  <div className="bg-black/30 rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="text-white text-xs mt-1">
                    Progresso da Captura
                  </p>
                </div>

                {/* Tension Bar */}
                <div className="absolute top-16 left-4 right-16">
                  <div className="bg-black/30 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-400 to-red-600"
                      style={{ width: `${tension * 100}%` }}
                    />
                  </div>
                  <p className="text-white text-xs mt-1">Tensão da Linha</p>
                </div>

                {/* Fish Image */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <motion.img
                    src={currentFish.imageUrl}
                    alt={currentFish.name}
                    className="w-24 h-24 object-contain"
                    animate={{
                      x: [0, 5, -5, 0],
                      y: [0, -2, 2, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>

                {/* Instructions */}
                <div className="absolute top-32 left-4">
                  <p className="text-white text-xs bg-black/40 px-2 py-1 rounded">
                    Segure para subir a barra
                  </p>
                </div>
              </div>
            )}

            {gameState === "success" && currentFish && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-white text-xl font-bold mb-2">
                    Capturado!
                  </h3>
                  <img
                    src={currentFish.imageUrl}
                    alt={currentFish.name}
                    className="w-20 h-20 object-contain mx-auto mb-2"
                  />
                  <p className="text-white">{currentFish.name}</p>
                </div>
              </div>
            )}

            {gameState === "failed" && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">💔</div>
                  <h3 className="text-white text-xl font-bold mb-2">
                    O peixe escapou!
                  </h3>
                  <p className="text-white/80 mb-4">A linha arrebentou...</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startFishing}
                    className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors"
                  >
                    Tentar Novamente
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
