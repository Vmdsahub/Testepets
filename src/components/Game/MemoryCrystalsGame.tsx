import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Play } from "lucide-react";

interface GameState {
  bird: { x: number; y: number; velocity: number };
  pipes: Array<{ x: number; height: number; passed: boolean }>;
  score: number;
  gameStatus: "waiting" | "playing" | "gameOver";
}

interface MemoryCrystalsGameProps {
  onBack: () => void;
}

export const MemoryCrystalsGame: React.FC<MemoryCrystalsGameProps> = ({
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Game constants
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const BIRD_SIZE = 20;
  const PIPE_WIDTH = 50;
  const PIPE_GAP = 150;
  const GRAVITY = 0.5;
  const JUMP_FORCE = -8;
  const PIPE_SPEED = 2;

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    bird: { x: 100, y: CANVAS_HEIGHT / 2, velocity: 0 },
    pipes: [],
    score: 0,
    gameStatus: "waiting",
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("memory-crystals-high-score");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Generate a new pipe
  const generatePipe = useCallback((x: number) => {
    const minHeight = 100;
    const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;
    return { x, height, passed: false };
  }, []);

  // Initialize game
  const initGame = useCallback(() => {
    setGameState({
      bird: { x: 100, y: CANVAS_HEIGHT / 2, velocity: 0 },
      pipes: [generatePipe(CANVAS_WIDTH)],
      score: 0,
      gameStatus: "waiting",
    });
  }, [generatePipe]);

  // Start game
  const startGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, gameStatus: "playing" }));
  }, []);

  // Jump
  const jump = useCallback(() => {
    if (gameState.gameStatus === "waiting") {
      startGame();
    }
    if (gameState.gameStatus === "playing") {
      setGameState((prev) => ({
        ...prev,
        bird: { ...prev.bird, velocity: JUMP_FORCE },
      }));
    }
  }, [gameState.gameStatus, startGame]);

  // Game over
  const gameOver = useCallback(() => {
    setGameState((prev) => {
      const newHighScore = Math.max(prev.score, highScore);
      if (newHighScore > highScore) {
        setHighScore(newHighScore);
        localStorage.setItem(
          "memory-crystals-high-score",
          newHighScore.toString(),
        );
      }
      return { ...prev, gameStatus: "gameOver" };
    });
  }, [highScore]);

  // Update game physics
  const updateGame = useCallback(
    (deltaTime: number) => {
      if (gameState.gameStatus !== "playing") return;

      setGameState((prev) => {
        const newBird = { ...prev.bird };
        const newPipes = [...prev.pipes];
        let newScore = prev.score;

        // Update bird physics
        newBird.velocity += GRAVITY;
        newBird.y += newBird.velocity;

        // Check boundaries
        if (newBird.y < 0 || newBird.y > CANVAS_HEIGHT - BIRD_SIZE) {
          gameOver();
          return prev;
        }

        // Update pipes
        for (let i = newPipes.length - 1; i >= 0; i--) {
          const pipe = newPipes[i];
          pipe.x -= PIPE_SPEED;

          // Remove pipes that are off screen
          if (pipe.x + PIPE_WIDTH < 0) {
            newPipes.splice(i, 1);
            continue;
          }

          // Check if bird passed pipe
          if (!pipe.passed && newBird.x > pipe.x + PIPE_WIDTH) {
            pipe.passed = true;
            newScore++;
          }

          // Collision detection
          const birdLeft = newBird.x;
          const birdRight = newBird.x + BIRD_SIZE;
          const birdTop = newBird.y;
          const birdBottom = newBird.y + BIRD_SIZE;

          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + PIPE_WIDTH;

          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check collision with top pipe
            if (birdTop < pipe.height) {
              gameOver();
              return prev;
            }
            // Check collision with bottom pipe
            if (birdBottom > pipe.height + PIPE_GAP) {
              gameOver();
              return prev;
            }
          }
        }

        // Generate new pipes
        const lastPipe = newPipes[newPipes.length - 1];
        if (!lastPipe || lastPipe.x < CANVAS_WIDTH - 200) {
          newPipes.push(generatePipe(CANVAS_WIDTH));
        }

        return {
          bird: newBird,
          pipes: newPipes,
          score: newScore,
          gameStatus: "playing",
        };
      });
    },
    [gameState.gameStatus, gameOver, generatePipe],
  );

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
    ctx.translate(
      gameState.bird.x + BIRD_SIZE / 2,
      gameState.bird.y + BIRD_SIZE / 2,
    );

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
    gameState.pipes.forEach((pipe) => {
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
    ctx.fillText(`Cristais: ${gameState.score}`, CANVAS_WIDTH / 2, 50);

    // Draw game status text
    if (gameState.gameStatus === "waiting") {
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

    if (gameState.gameStatus === "gameOver") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.fillText("Fim de Jogo!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.font = "18px Arial";
      ctx.fillText(
        `Pontuação: ${gameState.score}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
      );
      ctx.fillText(
        `Recorde: ${highScore}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 30,
      );
    }
  }, [gameState, highScore]);

  // Game loop
  const gameLoop = useCallback(
    (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      updateGame(deltaTime);
      render();

      animationRef.current = requestAnimationFrame(gameLoop);
    },
    [updateGame, render],
  );

  // Initialize game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Start game loop
  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  // Handle canvas clicks
  const handleCanvasClick = useCallback(() => {
    jump();
  }, [jump]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [jump]);

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
            {gameState.gameStatus === "gameOver" && (
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

        {/* Controls Info */}
        <div className="text-center text-sm text-gray-600">
          <p className="mb-1">🖱️ Clique ou pressione Espaço para voar</p>
          <p>Evite colidir com as formações cristalinas!</p>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="font-semibold text-gray-800">{gameState.score}</div>
            <div className="text-xs text-gray-600">Pontuação</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-800">{highScore}</div>
            <div className="text-xs text-gray-600">Recorde</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
