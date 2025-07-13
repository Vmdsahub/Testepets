import React, { useRef, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

interface Fish {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  caught: boolean;
  revealed: boolean;
}

interface Hook {
  x: number;
  y: number;
  dropping: boolean;
  rising: boolean;
  hasFish: boolean;
}

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const [score, setScore] = useState(0);
  const [fish, setFish] = useState<Fish[]>([]);
  const [hook, setHook] = useState<Hook>({
    x: 400,
    y: 100,
    dropping: false,
    rising: false,
    hasFish: false,
  });

  // Game constants
  const WATER_LEVEL = 200;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Initialize fish
  useEffect(() => {
    const newFish: Fish[] = [];
    for (let i = 0; i < 3; i++) {
      newFish.push({
        id: `fish-${i}`,
        x: 100 + Math.random() * (CANVAS_WIDTH - 200),
        y:
          WATER_LEVEL +
          50 +
          Math.random() * (CANVAS_HEIGHT - WATER_LEVEL - 100),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
        size: 30 + Math.random() * 20,
        caught: false,
        revealed: false,
      });
    }
    setFish(newFish);
  }, []);

  // Update fish positions
  const updateFish = () => {
    setFish((prevFish) =>
      prevFish.map((f) => {
        if (f.caught) return f;

        let newX = f.x + f.vx;
        let newY = f.y + f.vy;

        // Bounce off walls
        if (newX <= 50 || newX >= CANVAS_WIDTH - 50) {
          f.vx = -f.vx;
          newX = Math.max(50, Math.min(CANVAS_WIDTH - 50, newX));
        }

        // Stay in water
        if (newY <= WATER_LEVEL + 20 || newY >= CANVAS_HEIGHT - 50) {
          f.vy = -f.vy;
          newY = Math.max(WATER_LEVEL + 20, Math.min(CANVAS_HEIGHT - 50, newY));
        }

        return { ...f, x: newX, y: newY };
      }),
    );
  };

  // Update hook
  const updateHook = () => {
    setHook((prevHook) => {
      const newHook = { ...prevHook };

      if (newHook.dropping) {
        newHook.y += 3;

        // Check fish collision
        const caughtFish = fish.find(
          (f) =>
            !f.caught &&
            Math.abs(f.x - newHook.x) < f.size / 2 &&
            Math.abs(f.y - newHook.y) < f.size / 2,
        );

        if (caughtFish) {
          setFish((prev) =>
            prev.map((f) =>
              f.id === caughtFish.id
                ? { ...f, caught: true, revealed: true }
                : f,
            ),
          );
          newHook.hasFish = true;
          newHook.dropping = false;
          newHook.rising = true;
          setScore((prev) => prev + 1);
        }

        // Hit bottom
        if (newHook.y >= CANVAS_HEIGHT - 30) {
          newHook.dropping = false;
          newHook.rising = true;
        }
      }

      if (newHook.rising) {
        newHook.y -= 3;

        if (newHook.y <= 100) {
          newHook.y = 100;
          newHook.rising = false;
          newHook.hasFish = false;
        }
      }

      return newHook;
    });
  };

  // Draw everything
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#001122";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, WATER_LEVEL);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(1, "#4682B4");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, WATER_LEVEL);

    // Draw water
    const waterGradient = ctx.createLinearGradient(
      0,
      WATER_LEVEL,
      0,
      CANVAS_HEIGHT,
    );
    waterGradient.addColorStop(0, "#006994");
    waterGradient.addColorStop(1, "#003f5c");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, WATER_LEVEL, CANVAS_WIDTH, CANVAS_HEIGHT - WATER_LEVEL);

    // Draw water surface
    ctx.fillStyle = "#0077be";
    ctx.fillRect(0, WATER_LEVEL - 3, CANVAS_WIDTH, 6);

    // Draw fish
    fish.forEach((f) => {
      if (f.caught && !hook.hasFish) return;

      ctx.save();
      ctx.translate(f.x, f.y);

      if (f.revealed) {
        // Draw real fish
        ctx.fillStyle = "#4FC3F7";
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size / 2, f.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(f.size / 4, -f.size / 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.fillStyle = "#29B6F6";
        ctx.beginPath();
        ctx.moveTo(-f.size / 2, 0);
        ctx.lineTo(-f.size, -f.size / 4);
        ctx.lineTo(-f.size, f.size / 4);
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw silhouette
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size / 2, f.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail silhouette
        ctx.beginPath();
        ctx.moveTo(-f.size / 2, 0);
        ctx.lineTo(-f.size, -f.size / 4);
        ctx.lineTo(-f.size, f.size / 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });

    // Draw fishing line
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hook.x, 0);
    ctx.lineTo(hook.x, hook.y);
    ctx.stroke();

    // Draw hook
    ctx.fillStyle = "#C0C0C0";
    ctx.beginPath();
    ctx.arc(hook.x, hook.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw caught fish on hook
    if (hook.hasFish) {
      const caughtFish = fish.find((f) => f.caught && f.revealed);
      if (caughtFish) {
        ctx.save();
        ctx.translate(hook.x, hook.y + 15);
        ctx.fillStyle = "#4FC3F7";
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          caughtFish.size / 2,
          caughtFish.size / 3,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      }
    }
  };

  // Game loop
  const gameLoop = () => {
    updateFish();
    updateHook();
    draw();
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Start game loop
  useEffect(() => {
    gameLoop();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fish, hook]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (hook.dropping || hook.rising) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (y > WATER_LEVEL) {
        // Only cast in water
        setHook((prev) => ({
          ...prev,
          x: x,
          y: 100,
          dropping: true,
          rising: false,
          hasFish: false,
        }));
      }
    }
  };

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center relative">
      {/* Back button */}
      <button
        onClick={() => setCurrentScreen("exploration")}
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

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        className="border border-blue-400 rounded-lg cursor-crosshair shadow-2xl"
      />
    </div>
  );
};
