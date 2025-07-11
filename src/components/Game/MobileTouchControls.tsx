import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Navigation } from "lucide-react";

interface TouchControlsProps {
  onMovement: (direction: { x: number; y: number }) => void;
  onShoot: () => void;
  isShootingDisabled?: boolean;
}

interface TouchInfo {
  x: number;
  y: number;
  active: boolean;
}

export const MobileTouchControls: React.FC<TouchControlsProps> = ({
  onMovement,
  onShoot,
  isShootingDisabled = false,
}) => {
  const movementAreaRef = useRef<HTMLDivElement>(null);
  const [movementTouch, setMovementTouch] = useState<TouchInfo>({
    x: 0,
    y: 0,
    active: false,
  });

  // Handle movement touch start
  const handleMovementTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = movementAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setMovementTouch({
      x: touch.clientX - centerX,
      y: touch.clientY - centerY,
      active: true,
    });
  }, []);

  // Handle movement touch move
  const handleMovementTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!movementTouch.active) return;

      const touch = e.touches[0];
      const rect = movementAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate relative position from center
      const x = touch.clientX - centerX;
      const y = touch.clientY - centerY;

      // Limit to circle radius (max 80px from center)
      const maxDistance = 80;
      const distance = Math.sqrt(x * x + y * y);

      let normalizedX = x;
      let normalizedY = y;

      if (distance > maxDistance) {
        normalizedX = (x / distance) * maxDistance;
        normalizedY = (y / distance) * maxDistance;
      }

      setMovementTouch({
        x: normalizedX,
        y: normalizedY,
        active: true,
      });

      // Convert to normalized direction (-1 to 1)
      const directionX = normalizedX / maxDistance;
      const directionY = normalizedY / maxDistance;

      onMovement({ x: directionX, y: directionY });
    },
    [movementTouch.active, onMovement],
  );

  // Handle movement touch end
  const handleMovementTouchEnd = useCallback(() => {
    setMovementTouch({
      x: 0,
      y: 0,
      active: false,
    });
    onMovement({ x: 0, y: 0 });
  }, [onMovement]);

  // Handle shoot button
  const handleShootTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isShootingDisabled) {
        onShoot();
      }
    },
    [onShoot, isShootingDisabled],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMovementTouch({ x: 0, y: 0, active: false });
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Movement Control - Bottom Left */}
      <div className="absolute bottom-8 left-8 pointer-events-auto">
        <div
          ref={movementAreaRef}
          className="relative w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30 flex items-center justify-center"
          onTouchStart={handleMovementTouchStart}
          onTouchMove={handleMovementTouchMove}
          onTouchEnd={handleMovementTouchEnd}
          style={{ touchAction: "none" }}
        >
          {/* Background Circle */}
          <div className="absolute inset-2 bg-white/10 rounded-full" />

          {/* Center Indicator */}
          <div className="absolute w-4 h-4 bg-white/40 rounded-full" />

          {/* Movement Indicator */}
          {movementTouch.active && (
            <motion.div
              className="absolute w-6 h-6 bg-blue-400 rounded-full shadow-lg"
              style={{
                transform: `translate(${movementTouch.x}px, ${movementTouch.y}px)`,
              }}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
          )}

          {/* Direction Indicator */}
          <Navigation className="w-6 h-6 text-white/60" />
        </div>

        {/* Movement Label */}
        <div className="text-center mt-2">
          <span className="text-xs text-white/80 font-medium">Movimento</span>
        </div>
      </div>

      {/* Shoot Button - Bottom Right */}
      <div className="absolute bottom-8 right-8 pointer-events-auto">
        <motion.button
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-3 transition-all duration-200 ${
            isShootingDisabled
              ? "bg-gray-400/50 border-gray-500/30 cursor-not-allowed"
              : "bg-red-500/80 border-red-400/50 hover:bg-red-500/90 active:bg-red-600/90"
          }`}
          onTouchStart={handleShootTouchStart}
          disabled={isShootingDisabled}
          whileTap={{ scale: 0.9 }}
          style={{ touchAction: "manipulation" }}
        >
          <Target
            className={`w-8 h-8 ${
              isShootingDisabled ? "text-gray-300" : "text-white"
            }`}
          />
        </motion.button>

        {/* Shoot Label */}
        <div className="text-center mt-2">
          <span className="text-xs text-white/80 font-medium">Atirar</span>
        </div>
      </div>

      {/* Visual Indicators */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
          <span className="text-xs text-white/90 font-medium">
            Controles Móveis Ativos
          </span>
        </div>
      </div>
    </div>
  );
};
