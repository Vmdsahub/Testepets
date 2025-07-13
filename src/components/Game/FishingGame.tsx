import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface Fish {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  caught: boolean;
  silhouette: boolean;
}

interface FishingGameProps {
  onBack: () => void;
  onFishCaught: (fish: Fish) => void;
}

export const FishingGame: React.FC<FishingGameProps> = ({
  onBack,
  onFishCaught,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);

  // Game state
  const fishRef = useRef<Fish[]>([]);
  const hookRef = useRef({
    x: 400,
    y: 50,
    isDropping: false,
    isRising: false,
    caughtFish: null as Fish | null,
  });
  const cameraRef = useRef({ x: 0, y: 0 });

  // Constants
  const WATER_LEVEL = 150;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Initialize fish
  const initializeFish = useCallback(() => {
    fishRef.current = [
      {
        id: "fish-1",
        name: "Peixe Cristalino",
        imageUrl:
          "https://cdn.builder.io/api/v1/image/assets%2F14397f3b3f9049c3ad3ca64e1b66afd5%2F3c3112f8a28e4b8d9b5a3ca4741db1d5?format=webp&width=800",
        x: 200,
        y: 300,
        vx: 1,
        vy: 0.5,
        size: 40,
        caught: false,
        silhouette: true,
      },
      {
        id: "fish-2",
        name: "Peixe Dourado",
        imageUrl:
          "https://cdn.builder.io/api/v1/image/assets%2F14397f3b3f9049c3ad3ca64e1b66afd5%2F3c3112f8a28e4b8d9b5a3ca4741db1d5?format=webp&width=800",
        x: 500,
        y: 400,
        vx: -1.5,
        vy: -0.3,
        size: 35,
        caught: false,
        silhouette: true,
      },
    ];
  }, []);

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw water
    const waterGradient = ctx.createLinearGradient(
      0,
      WATER_LEVEL,
      0,
      CANVAS_HEIGHT,
    );
    waterGradient.addColorStop(0, "#2196F3");
    waterGradient.addColorStop(1, "#0D47A1");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, WATER_LEVEL, CANVAS_WIDTH, CANVAS_HEIGHT - WATER_LEVEL);

    // Draw water surface
    ctx.fillStyle = "#64B5F6";
    ctx.fillRect(0, WATER_LEVEL - 5, CANVAS_WIDTH, 10);

    // Draw fish
    fishRef.current.forEach((fish) => {
      if (fish.caught) return;

      ctx.save();
      ctx.translate(fish.x, fish.y);

      if (fish.silhouette) {
        // Draw silhouette
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size / 2, fish.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-fish.size / 2, 0);
        ctx.lineTo(-fish.size, -fish.size / 4);
        ctx.lineTo(-fish.size, fish.size / 4);
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw revealed fish (simple colored fish for now)
        ctx.fillStyle = "#4FC3F7";
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size / 2, fish.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.fillStyle = "#29B6F6";
        ctx.beginPath();
        ctx.moveTo(-fish.size / 2, 0);
        ctx.lineTo(-fish.size, -fish.size / 4);
        ctx.lineTo(-fish.size, fish.size / 4);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(fish.size / 4, -fish.size / 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Draw hook and line
    const hook = hookRef.current;
    ctx.strokeStyle = "#8D6E63";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hook.x, 0);
    ctx.lineTo(hook.x, hook.y);
    ctx.stroke();

    // Hook
    ctx.fillStyle = "#757575";
    ctx.fillRect(hook.x - 4, hook.y - 6, 8, 12);

    // Caught fish
    if (hook.caughtFish) {
      ctx.save();
      ctx.translate(hook.x, hook.y + 25);
      ctx.fillStyle = "#4FC3F7";
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        hook.caughtFish.size / 2,
        hook.caughtFish.size / 3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }
  }, []);

  // Update fish movement
  const updateFish = useCallback(() => {
    fishRef.current = fishRef.current.map((fish) => {
      if (fish.caught) return fish;

      let newX = fish.x + fish.vx;
      let newY = fish.y + fish.vy;
      let newVx = fish.vx;
      let newVy = fish.vy;

      // Bounce off walls
      if (newX <= 20 || newX >= CANVAS_WIDTH - 20) {
        newVx = -newVx;
      }

      // Stay in water
      if (newY <= WATER_LEVEL + 20 || newY >= CANVAS_HEIGHT - 20) {
        newVy = -newVy;
      }

      return { ...fish, x: newX, y: newY, vx: newVx, vy: newVy };
    });
  }, []);

  // Update hook
  const updateHook = useCallback(() => {
    const hook = hookRef.current;

    if (hook.isDropping) {
      hook.y += 3;

      // Check fish collision
      const caughtFish = fishRef.current.find(
        (fish) =>
          !fish.caught &&
          Math.abs(fish.x - hook.x) < fish.size / 2 &&
          Math.abs(fish.y - hook.y) < fish.size / 2,
      );

      if (caughtFish) {
        hook.caughtFish = { ...caughtFish, silhouette: false };
        hook.isDropping = false;
        hook.isRising = true;

        // Mark fish as caught
        fishRef.current = fishRef.current.map((fish) =>
          fish.id === caughtFish.id ? { ...fish, caught: true } : fish,
        );
      }

      // Hit bottom
      if (hook.y >= CANVAS_HEIGHT - 50) {
        hook.isDropping = false;
        hook.isRising = true;
      }
    }

    if (hook.isRising) {
      hook.y -= 3;

      if (hook.y <= 50) {
        hook.y = 50;
        hook.isRising = false;

        if (hook.caughtFish) {
          onFishCaught(hook.caughtFish);
          setScore((prev) => prev + 1);
          hook.caughtFish = null;
        }
      }
    }
  }, [onFishCaught]);

  // Game loop
  const gameLoop = useCallback(() => {
    updateFish();
    updateHook();
    draw();

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [updateFish, updateHook, draw]);

  // Start game
  useEffect(() => {
    if (!gameStarted) {
      setGameStarted(true);
      initializeFish();
    }

    if (gameStarted) {
      gameLoop();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameLoop, initializeFish]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && !hookRef.current.isDropping && !hookRef.current.isRising) {
      const x = e.clientX - rect.left;
      hookRef.current.x = x;
      hookRef.current.y = 50;
      hookRef.current.isDropping = true;
    }
  };

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center relative">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur text-white p-3 rounded-lg hover:bg-white/30 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Score */}
      <div className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg">
        Peixes: {score}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg">
        Clique na água para pescar
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        className="border border-gray-600 rounded-lg cursor-crosshair bg-blue-900"
      />
    </div>
  );
};
