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
  depth: number;
  caught: boolean;
  silhouette: boolean;
}

interface Hook {
  x: number;
  y: number;
  isDropping: boolean;
  isRising: boolean;
  caughtFish: Fish | null;
}

interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
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
  const [gameState, setGameState] = useState<
    "idle" | "casting" | "fishing" | "caught"
  >("idle");
  const [score, setScore] = useState(0);

  // Game objects
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });
  const [hook, setHook] = useState<Hook>({
    x: 400,
    y: 50,
    isDropping: false,
    isRising: false,
    caughtFish: null,
  });
  const [fish, setFish] = useState<Fish[]>([]);

  // Game constants
  const WATER_LEVEL = 150;
  const HOOK_SPEED = 3;
  const FISH_SPAWN_COUNT = 5;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const WATER_DEPTH = CANVAS_HEIGHT - WATER_LEVEL;

  // Initialize fish
  const initializeFish = useCallback(() => {
    const newFish: Fish[] = [];

    for (let i = 0; i < FISH_SPAWN_COUNT; i++) {
      newFish.push({
        id: `fish-${i}`,
        name: `Peixe ${i + 1}`,
        imageUrl:
          "https://cdn.builder.io/api/v1/image/assets%2F14397f3b3f9049c3ad3ca64e1b66afd5%2F3c3112f8a28e4b8d9b5a3ca4741db1d5?format=webp&width=800",
        x: Math.random() * (CANVAS_WIDTH - 100) + 50,
        y: WATER_LEVEL + Math.random() * (WATER_DEPTH - 100) + 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
        size: 30 + Math.random() * 20,
        depth: Math.random(),
        caught: false,
        silhouette: true,
      });
    }

    setFish(newFish);
  }, []);

  // Draw background layer
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, WATER_LEVEL);
    skyGradient.addColorStop(0, "#87CEEB"); // Sky blue
    skyGradient.addColorStop(1, "#B0E0E6"); // Powder blue

    ctx.fillStyle = skyGradient;
    ctx.fillRect(-camera.x, -camera.y, CANVAS_WIDTH * 2, WATER_LEVEL);

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 3; i++) {
      const cloudX = i * 200 + 100 - camera.x * 0.5; // Parallax effect
      const cloudY = 30 - camera.y * 0.3;

      // Simple cloud shape
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 30, 0, Math.PI * 2);
      ctx.arc(cloudX + 25, cloudY, 35, 0, Math.PI * 2);
      ctx.arc(cloudX + 50, cloudY, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Draw water layer
  const drawWater = (ctx: CanvasRenderingContext2D) => {
    // Water surface
    ctx.fillStyle = "#1E90FF";
    ctx.fillRect(-camera.x, WATER_LEVEL - camera.y, CANVAS_WIDTH * 2, 5);

    // Water depth gradient
    const waterGradient = ctx.createLinearGradient(
      0,
      WATER_LEVEL,
      0,
      CANVAS_HEIGHT,
    );
    waterGradient.addColorStop(0, "#4169E1"); // Royal blue
    waterGradient.addColorStop(0.5, "#1E3A8A"); // Dark blue
    waterGradient.addColorStop(1, "#0F172A"); // Very dark blue

    ctx.fillStyle = waterGradient;
    ctx.fillRect(
      -camera.x,
      WATER_LEVEL - camera.y,
      CANVAS_WIDTH * 2,
      WATER_DEPTH,
    );

    // Water bubbles
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 10; i++) {
      const bubbleX =
        Math.sin(Date.now() * 0.001 + i) * 100 + i * 80 - camera.x;
      const bubbleY =
        WATER_LEVEL + Math.sin(Date.now() * 0.002 + i) * 50 + i * 40 - camera.y;

      if (bubbleY > WATER_LEVEL - camera.y) {
        ctx.beginPath();
        ctx.arc(
          bubbleX,
          bubbleY,
          3 + Math.sin(Date.now() * 0.003 + i) * 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  };

  // Draw fish
  const drawFish = (ctx: CanvasRenderingContext2D) => {
    fish.forEach((f) => {
      if (f.caught) return;

      const fishX = f.x - camera.x;
      const fishY = f.y - camera.y;

      if (f.silhouette) {
        // Draw silhouette
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();

        // Fish body (ellipse)
        ctx.save();
        ctx.translate(fishX, fishY);
        ctx.scale(f.vx > 0 ? 1 : -1, 1); // Flip based on direction

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size * 0.6, f.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.6, 0);
        ctx.lineTo(-f.size * 1.2, -f.size * 0.3);
        ctx.lineTo(-f.size * 1.2, f.size * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else {
        // Draw actual fish image (after caught)
        const img = new Image();
        img.src = f.imageUrl;

        ctx.save();
        ctx.translate(fishX, fishY);
        ctx.scale(f.vx > 0 ? 1 : -1, 1);
        ctx.drawImage(img, -f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
      }
    });
  };

  // Draw hook and line
  const drawHook = (ctx: CanvasRenderingContext2D) => {
    const hookX = hook.x - camera.x;
    const hookY = hook.y - camera.y;

    // Fishing line
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hookX, -camera.y); // From top of screen
    ctx.lineTo(hookX, hookY);
    ctx.stroke();

    // Hook
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(hookX - 3, hookY - 8, 6, 16);

    // Hook curve
    ctx.strokeStyle = "#C0C0C0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hookX + 5, hookY, 5, 0, Math.PI);
    ctx.stroke();

    // Caught fish
    if (hook.caughtFish) {
      const fishX = hookX;
      const fishY = hookY + 20;

      const img = new Image();
      img.src = hook.caughtFish.imageUrl;
      ctx.drawImage(
        img,
        fishX - hook.caughtFish.size / 2,
        fishY - hook.caughtFish.size / 2,
        hook.caughtFish.size,
        hook.caughtFish.size,
      );
    }
  };

  // Update fish movement
  const updateFish = useCallback(() => {
    setFish((prevFish) =>
      prevFish.map((f) => {
        if (f.caught) return f;

        let newX = f.x + f.vx;
        let newY = f.y + f.vy;
        let newVx = f.vx;
        let newVy = f.vy;

        // Bounce off walls
        if (newX <= 0 || newX >= CANVAS_WIDTH) {
          newVx = -newVx;
          newX = Math.max(0, Math.min(CANVAS_WIDTH, newX));
        }

        // Stay in water
        if (newY <= WATER_LEVEL || newY >= CANVAS_HEIGHT - 20) {
          newVy = -newVy;
          newY = Math.max(WATER_LEVEL, Math.min(CANVAS_HEIGHT - 20, newY));
        }

        // Random direction change
        if (Math.random() < 0.01) {
          newVx += (Math.random() - 0.5) * 0.5;
          newVy += (Math.random() - 0.5) * 0.3;

          // Limit speed
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speed > 2) {
            newVx = (newVx / speed) * 2;
            newVy = (newVy / speed) * 2;
          }
        }

        return {
          ...f,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
        };
      }),
    );
  }, []);

  // Update hook movement
  const updateHook = useCallback(() => {
    setHook((prevHook) => {
      let newHook = { ...prevHook };

      if (newHook.isDropping) {
        newHook.y += HOOK_SPEED;

        // Check collision with fish
        const caughtFish = fish.find(
          (f) =>
            !f.caught &&
            Math.abs(f.x - newHook.x) < f.size / 2 &&
            Math.abs(f.y - newHook.y) < f.size / 2,
        );

        if (caughtFish) {
          newHook.caughtFish = { ...caughtFish, silhouette: false };
          newHook.isDropping = false;
          newHook.isRising = true;

          // Mark fish as caught
          setFish((prevFish) =>
            prevFish.map((f) =>
              f.id === caughtFish.id ? { ...f, caught: true } : f,
            ),
          );

          setGameState("caught");
        }

        // Stop at bottom
        if (newHook.y >= CANVAS_HEIGHT - 20) {
          newHook.isDropping = false;
          newHook.isRising = true;
        }
      }

      if (newHook.isRising) {
        newHook.y -= HOOK_SPEED;

        // Return to surface
        if (newHook.y <= 50) {
          newHook.y = 50;
          newHook.isRising = false;

          if (newHook.caughtFish) {
            onFishCaught(newHook.caughtFish);
            setScore((prev) => prev + 1);
            newHook.caughtFish = null;
          }

          setGameState("idle");
        }
      }

      return newHook;
    });
  }, [fish, onFishCaught]);

  // Update camera to follow hook
  const updateCamera = useCallback(() => {
    setCamera((prevCamera) => {
      const newCamera = { ...prevCamera };

      // Target follows hook
      newCamera.targetX = hook.x - CANVAS_WIDTH / 2;
      newCamera.targetY = hook.y - CANVAS_HEIGHT / 2;

      // Smooth camera movement
      newCamera.x += (newCamera.targetX - newCamera.x) * 0.1;
      newCamera.y += (newCamera.targetY - newCamera.y) * 0.1;

      // Limit camera bounds
      newCamera.x = Math.max(
        -CANVAS_WIDTH / 2,
        Math.min(CANVAS_WIDTH / 2, newCamera.x),
      );
      newCamera.y = Math.max(-100, Math.min(CANVAS_HEIGHT / 2, newCamera.y));

      return newCamera;
    });
  }, [hook.x, hook.y]);

  // Game loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      updateFish();
      updateHook();
      updateCamera();
    }, 16); // ~60 FPS

    return () => clearInterval(gameLoop);
  }, [updateFish, updateHook, updateCamera]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw layers
      drawBackground(ctx);
      drawWater(ctx);
      drawFish(ctx);
      drawHook(ctx);

      requestAnimationFrame(render);
    };

    render();
  }, [camera, hook, fish]);

  // Initialize game
  useEffect(() => {
    initializeFish();
  }, [initializeFish]);

  // Handle click to cast
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState === "idle") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;

        setHook((prev) => ({
          ...prev,
          x: x + camera.x,
          isDropping: true,
          isRising: false,
          caughtFish: null,
        }));

        setGameState("casting");
      }
    }
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* Back button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur text-white p-2 rounded-lg hover:bg-white/30 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </motion.button>

      {/* Score */}
      <div className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg">
        Peixes: {score}
      </div>

      {/* Instructions */}
      {gameState === "idle" && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg text-center">
          Clique na água para lançar o anzol
        </div>
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        className="w-full h-full object-cover cursor-crosshair"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Title */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 text-white/10 text-8xl font-bold pointer-events-none select-none">
        🏛️ TEMPLO DOS ANCIÕES
      </div>
    </div>
  );
};
