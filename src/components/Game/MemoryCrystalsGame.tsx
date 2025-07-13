import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Coins, RefreshCw } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

interface Bird {
  x: number;
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  height: number;
  passed: boolean;
}

interface MemoryCrystalsGameProps {
  onBack: () => void;
}

export const MemoryCrystalsGame: React.FC<MemoryCrystalsGameProps> = ({
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { xenocoins, updateCurrency } = useGameStore();

  // Game constants
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const BIRD_SIZE = 12; // Much smaller bird
  const PIPE_WIDTH = 50;
  const PIPE_GAP = 250; // Even bigger gap
  const GRAVITY = 0.05; // Very minimal gravity - bird almost floats
  const JUMP_FORCE = -3; // Very gentle jump force
  const PIPE_SPEED = 0.8; // Even slower pipe movement

  // Game state
  const [bird, setBird] = useState<Bird>({
    x: 100,
    y: CANVAS_HEIGHT / 2,
    velocity: 0,
  });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<
    "waiting" | "playing" | "gameOver"
  >("waiting");
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("memory-crystals-high-score");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Daily rewards tracking
  const [dailyRewards, setDailyRewards] = useState(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem("memory-crystals-daily-rewards");
    if (saved) {
      const data = JSON.parse(saved);
      if (data.date === today) {
        return data.count;
      }
    }
    return 0;
  });

  const [showRewardOptions, setShowRewardOptions] = useState(false);

  // Initialize game
  const initGame = useCallback(() => {
    setBird({ x: 100, y: CANVAS_HEIGHT / 2, velocity: 0 });
    setPipes([{ x: CANVAS_WIDTH + 200, height: 250, passed: false }]); // Start further away with safe height
    setScore(0);
    setGameStatus("waiting");
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGameStatus("playing");
  }, []);

  // Jump
  const jump = useCallback(() => {
    if (gameStatus === "waiting") {
      startGame();
      setBird((prev) => ({ ...prev, velocity: JUMP_FORCE }));
    } else if (gameStatus === "playing") {
      setBird((prev) => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameStatus, startGame]);

  // Game over
  const endGame = useCallback(() => {
    setGameStatus("gameOver");
    setShowRewardOptions(true);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("memory-crystals-high-score", score.toString());
    }
  }, [score, highScore]);

  // Reward functions
  const canClaimReward = dailyRewards < 3 && score > 0;

  const claimXenocoins = useCallback(async () => {
    if (!canClaimReward) return;

    const rewardAmount = score * 10; // 10 xenocoins per point

    try {
      const success = await updateCurrency("xenocoins", rewardAmount);

      if (success) {
        // Update daily rewards count
        const today = new Date().toDateString();
        const newCount = dailyRewards + 1;
        setDailyRewards(newCount);
        localStorage.setItem(
          "memory-crystals-daily-rewards",
          JSON.stringify({
            date: today,
            count: newCount,
          }),
        );

        setShowRewardOptions(false);
        initGame();
      }
    } catch (error) {
      console.error("Failed to add xenocoins:", error);
    }
  }, [canClaimReward, score, updateCurrency, dailyRewards, initGame]);

  const tryAgain = useCallback(() => {
    setShowRewardOptions(false);
    initGame();
  }, [initGame]);

  // Generate new pipe
  const generatePipe = useCallback((x: number): Pipe => {
    const minHeight = 150; // Much more space at top
    const maxHeight = CANVAS_HEIGHT - PIPE_GAP - 150; // Much more space at bottom
    const height = Math.random() * (maxHeight - minHeight) + minHeight;
    return { x, height, passed: false };
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameStatus !== "playing") {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Update bird
    setBird((prev) => {
      const newBird = { ...prev };

      // Add hover effect - bird naturally wants to stay in center
      const centerY = CANVAS_HEIGHT / 2;
      const distanceFromCenter = Math.abs(newBird.y - centerY);

      // Apply gentle centering force
      if (newBird.y > centerY) {
        newBird.velocity -= 0.02; // Gentle upward force when below center
      } else {
        newBird.velocity += 0.02; // Gentle downward force when above center
      }

      // Apply minimal gravity
      newBird.velocity += GRAVITY;

      // Strong velocity damping for smooth movement
      newBird.velocity *= 0.95;

      // Limit maximum speed (much lower)
      if (newBird.velocity > 2) {
        newBird.velocity = 2;
      }
      if (newBird.velocity < -2) {
        newBird.velocity = -2;
      }

      newBird.y += newBird.velocity;

      // Check boundaries with generous margin
      if (newBird.y < -10 || newBird.y > CANVAS_HEIGHT - BIRD_SIZE + 10) {
        endGame();
        return prev;
      }

      return newBird;
    });

    // Update pipes
    setPipes((prev) => {
      const newPipes = [...prev];

      // Move pipes and check collisions
      for (let i = newPipes.length - 1; i >= 0; i--) {
        const pipe = newPipes[i];
        pipe.x -= PIPE_SPEED;

        // Remove pipes that are off screen
        if (pipe.x + PIPE_WIDTH < 0) {
          newPipes.splice(i, 1);
          continue;
        }

        // Check if bird passed pipe
        if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
          pipe.passed = true;
          setScore((prev) => prev + 1);
        }

        // Collision detection
        const birdLeft = bird.x;
        const birdRight = bird.x + BIRD_SIZE;
        const birdTop = bird.y;
        const birdBottom = bird.y + BIRD_SIZE;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          // Check collision with top pipe
          if (birdTop < pipe.height) {
            endGame();
            return prev;
          }
          // Check collision with bottom pipe
          if (birdBottom > pipe.height + PIPE_GAP) {
            endGame();
            return prev;
          }
        }
      }

      // Generate new pipes
      const lastPipe = newPipes[newPipes.length - 1];
      if (!lastPipe || lastPipe.x < CANVAS_WIDTH - 300) {
        // Much more spacing between pipes
        newPipes.push(generatePipe(CANVAS_WIDTH + 100)); // Start new pipes further away
      }

      return newPipes;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStatus, bird, endGame, generatePipe]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#3730a3");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bird (crystal)
    ctx.save();
    ctx.translate(bird.x + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);

    // Crystal shape
    ctx.fillStyle = "#60a5fa";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -BIRD_SIZE / 2);
    ctx.lineTo(BIRD_SIZE / 3, -BIRD_SIZE / 4);
    ctx.lineTo(BIRD_SIZE / 2, 0);
    ctx.lineTo(BIRD_SIZE / 3, BIRD_SIZE / 4);
    ctx.lineTo(0, BIRD_SIZE / 2);
    ctx.lineTo(-BIRD_SIZE / 3, BIRD_SIZE / 4);
    ctx.lineTo(-BIRD_SIZE / 2, 0);
    ctx.lineTo(-BIRD_SIZE / 3, -BIRD_SIZE / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner sparkle
    ctx.fillStyle = "#bfdbfe";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw pipes (crystal formations)
    pipes.forEach((pipe) => {
      // Top pipe
      const topPipeGradient = ctx.createLinearGradient(
        pipe.x,
        0,
        pipe.x + PIPE_WIDTH,
        0,
      );
      topPipeGradient.addColorStop(0, "#8b5cf6");
      topPipeGradient.addColorStop(1, "#a855f7");
      ctx.fillStyle = topPipeGradient;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.height);

      // Bottom pipe
      const bottomPipeGradient = ctx.createLinearGradient(
        pipe.x,
        pipe.height + PIPE_GAP,
        pipe.x + PIPE_WIDTH,
        CANVAS_HEIGHT,
      );
      bottomPipeGradient.addColorStop(0, "#8b5cf6");
      bottomPipeGradient.addColorStop(1, "#a855f7");
      ctx.fillStyle = bottomPipeGradient;
      ctx.fillRect(
        pipe.x,
        pipe.height + PIPE_GAP,
        PIPE_WIDTH,
        CANVAS_HEIGHT - pipe.height - PIPE_GAP,
      );

      // Crystal edges
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.height);
      ctx.strokeRect(
        pipe.x,
        pipe.height + PIPE_GAP,
        PIPE_WIDTH,
        CANVAS_HEIGHT - pipe.height - PIPE_GAP,
      );
    });

    // Draw score
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Cristais: ${score}`, CANVAS_WIDTH / 2, 50);

    // Draw game status text
    if (gameStatus === "waiting") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.fillText(
        "Cristais da Memória",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 60,
      );
      ctx.font = "16px Arial";
      ctx.fillText(
        "Clique para começar!",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 20,
      );
      ctx.fillText(
        "Evite as formações cristalinas",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 10,
      );
    }

    if (gameStatus === "gameOver" && !showRewardOptions) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.fillText("Fim de Jogo!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.font = "18px Arial";
      ctx.fillText(`Pontuação: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillText(
        `Recorde: ${highScore}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 30,
      );
    }
  }, [bird, pipes, score, gameStatus, highScore]);

  // Initialize game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Start animation loop
  useEffect(() => {
    const animate = () => {
      render();
      gameLoop();
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render, gameLoop]);

  // Handle canvas clicks
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("Canvas clicked, game status:", gameStatus);
      jump();
    },
    [jump, gameStatus],
  );

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        console.log("Key pressed, game status:", gameStatus);
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [jump, gameStatus]);

  return (
    <motion.div
      className="h-full w-full pt-20 pb-20 px-4 overflow-hidden flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="bg-white rounded-3xl shadow-xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">
            Cristais da Memória
          </h1>
          <div className="flex gap-2">
            {gameStatus === "gameOver" && (
              <motion.button
                onClick={initGame}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Reiniciar"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
            )}
            <motion.button
              onClick={onBack}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-gray-200 rounded-lg cursor-pointer select-none"
            onClick={handleCanvasClick}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>

        {/* Game Status Info */}
        <div className="text-center text-sm text-gray-600 mb-4">
          <p className="font-medium">
            Status:{" "}
            {gameStatus === "waiting"
              ? "Aguardando"
              : gameStatus === "playing"
                ? "Jogando"
                : "Fim de Jogo"}
          </p>
        </div>

        {/* Controls Info */}
        <div className="text-center text-sm text-gray-600">
          <p className="mb-1">🖱️ Clique ou pressione Espaço para voar</p>
          <p>Evite colidir com as formações cristalinas!</p>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="font-semibold text-gray-800">{score}</div>
            <div className="text-xs text-gray-600">Pontuação</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-800">{highScore}</div>
            <div className="text-xs text-gray-600">Recorde</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-800">{dailyRewards}/3</div>
            <div className="text-xs text-gray-600">Resgates Hoje</div>
          </div>
        </div>

        {/* Reward Options Overlay */}
        {showRewardOptions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Fim de Jogo!
                </h3>
                <p className="text-gray-600">Pontuação: {score}</p>
                {score > 0 && (
                  <p className="text-blue-600 text-sm">
                    Potencial ganho: {score * 10} Xenocoins
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {canClaimReward ? (
                  <motion.button
                    onClick={claimXenocoins}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                  >
                    <Coins className="w-5 h-5" />
                    Resgatar {score * 10} Xenocoins
                  </motion.button>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-lg font-medium text-center">
                    {dailyRewards >= 3
                      ? "Limite diário atingido (3/3)"
                      : "Sem pontuação para resgatar"}
                  </div>
                )}

                <motion.button
                  onClick={tryAgain}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Tentar Novamente
                </motion.button>
              </div>

              {dailyRewards < 3 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Resgates restantes hoje: {3 - dailyRewards}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
