import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import {
  fishingSettingsService,
  FishingSettings,
} from "../../services/fishingSettingsService";
import { FishingRod } from "../Game/FishingRod";

// Tipos para o sistema de pesca
interface Fish {
  id: string;
  x: number; // Posição X (0-1)
  y: number; // Posição Y (0-1)
  targetX: number;
  targetY: number;
  state: "swimming" | "reacting" | "moving" | "hooked";
  reactionTime?: number;
  speed: number;
}

interface WaterArea {
  x: number; // Posição X (pixels)
  y: number; // Posição Y (pixels)
  width: number; // Largura (pixels)
  height: number; // Altura (pixels)
  shape: "rectangle" | "circle" | "triangle" | "square";
}

interface Hook {
  x: number; // Posição X (pixels)
  y: number; // Posição Y (pixels)
  active: boolean;
}

export const FishingScreenNew: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
  const { user } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Estados
  const [fish, setFish] = useState<Fish>({
    id: "1",
    x: 0.5,
    y: 0.7,
    targetX: 0.5,
    targetY: 0.7,
    state: "swimming",
    speed: 0.001,
  });

  const [waterArea, setWaterArea] = useState<WaterArea>({
    x: 100,
    y: 200,
    width: 800,
    height: 400,
    shape: "rectangle",
  });

  const [hook, setHook] = useState<Hook>({
    x: 0,
    y: 0,
    active: false,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showFishingModal, setShowFishingModal] = useState(false);
  const [fishingSettings, setFishingSettings] =
    useState<FishingSettings | null>(null);

  const isAdmin = user?.isAdmin || false;

  // Load fishing settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await fishingSettingsService.getFishingSettings();
      setFishingSettings(settings);
    };
    loadSettings();
  }, []);

  // Movimento natural do peixe
  const updateFishPosition = (deltaTime: number) => {
    const time = Date.now() * 0.001;

    if (fish.state === "swimming") {
      // Movimento natural usando seno/cosseno
      const baseX = 0.5 + Math.sin(time * 0.5) * 0.3;
      const baseY = 0.7 + Math.cos(time * 0.3) * 0.1;

      setFish((prev) => ({
        ...prev,
        x: baseX,
        y: baseY,
        targetX: baseX,
        targetY: baseY,
      }));
    } else if (fish.state === "moving") {
      // Calcular posição alvo do CENTRO do peixe para que a BOCA toque o anzol
      const hookX = hook.x / window.innerWidth;
      const hookY = hook.y / window.innerHeight;

      // Posição alvo do centro do peixe (anzol - offset da boca)
      const targetCenterX = hookX - 0.03; // Boca fica 0.03 à direita do centro
      const targetCenterY = hookY; // Boca no mesmo Y do centro

      // Distância do centro atual para a posição alvo
      const dx = targetCenterX - fish.x;
      const dy = targetCenterY - fish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.005) {
        // Movimento suave sem teleporte
        const moveSpeed = Math.min(fish.speed, distance * 0.1); // Reduzir velocidade conforme se aproxima
        const moveX = (dx / distance) * moveSpeed;
        const moveY = (dy / distance) * moveSpeed;

        setFish((prev) => ({
          ...prev,
          x: prev.x + moveX,
          y: prev.y + moveY,
        }));
      } else {
        // Posicionar exatamente para que a boca toque o anzol
        setFish((prev) => ({
          ...prev,
          x: targetCenterX,
          y: targetCenterY,
          state: "hooked",
        }));
        setShowFishingModal(true);
      }
    }
  };

  // Sistema de pesca
  const handleHookCast = (x: number, y: number) => {
    console.log("🎣 Hook cast at:", x, y);

    setHook({ x, y, active: true });

    // Verificar se o anzol caiu na área da água
    const isInWater = isPointInWaterArea(x, y);
    if (isInWater) {
      // Verificar se o peixe também está na água
      const fishPixelX = fish.x * window.innerWidth;
      const fishPixelY = fish.y * window.innerHeight;
      const isFishInWater = isPointInWaterArea(fishPixelX, fishPixelY);

      if (isFishInWater) {
        // Iniciar reação do peixe após delay aleatório
        const reactionDelay = 2000 + Math.random() * 5000; // 2-7 segundos

        setTimeout(() => {
          setFish((prev) => ({
            ...prev,
            state: "reacting",
          }));

          // Após breve reação, começar movimento
          setTimeout(() => {
            setFish((prev) => ({
              ...prev,
              state: "moving",
            }));
          }, 1000);
        }, reactionDelay);
      }
    }
  };

  const handleLineReeled = () => {
    console.log("🎣 Line reeled in");
    setHook({ x: 0, y: 0, active: false });
    setFish((prev) => ({ ...prev, state: "swimming" }));
  };

  // Verificar se ponto está na área da água
  const isPointInWaterArea = (x: number, y: number): boolean => {
    switch (waterArea.shape) {
      case "rectangle":
      case "square":
        return (
          x >= waterArea.x &&
          x <= waterArea.x + waterArea.width &&
          y >= waterArea.y &&
          y <= waterArea.y + waterArea.height
        );

      case "circle":
        const centerX = waterArea.x + waterArea.width / 2;
        const centerY = waterArea.y + waterArea.height / 2;
        const radius = Math.min(waterArea.width, waterArea.height) / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius;

      case "triangle":
        // Triângulo simples - implementação básica
        const tx1 = waterArea.x + waterArea.width / 2;
        const ty1 = waterArea.y;
        const tx2 = waterArea.x;
        const ty2 = waterArea.y + waterArea.height;
        const tx3 = waterArea.x + waterArea.width;
        const ty3 = waterArea.y + waterArea.height;

        // Algoritmo de área para verificar se ponto está dentro do triângulo
        const area = Math.abs(
          (tx2 - tx1) * (ty3 - ty1) - (tx3 - tx1) * (ty2 - ty1),
        );
        const area1 = Math.abs(
          (x - tx2) * (ty3 - ty2) - (tx3 - tx2) * (y - ty2),
        );
        const area2 = Math.abs((tx1 - x) * (y - ty1) - (x - tx1) * (ty1 - y));
        const area3 = Math.abs(
          (tx2 - tx1) * (y - ty1) - (x - tx1) * (ty2 - ty1),
        );

        return Math.abs(area - (area1 + area2 + area3)) < 1;

      default:
        return false;
    }
  };

  // Renderização no canvas
  const render = (ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background
    if (fishingSettings?.backgroundImageUrl) {
      // TODO: Desenhar imagem de background
    } else {
      // Gradiente padrão
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(1, "#764ba2");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Peixe (atrás da água)
    const fishPixelX = fish.x * canvas.width;
    const fishPixelY = fish.y * canvas.height;

    ctx.fillStyle = fish.state === "hooked" ? "#ff6b6b" : "#4A90E2";
    ctx.beginPath();
    ctx.ellipse(fishPixelX, fishPixelY, 30, 20, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Cauda do peixe (à esquerda)
    ctx.beginPath();
    ctx.moveTo(fishPixelX - 25, fishPixelY);
    ctx.lineTo(fishPixelX - 45, fishPixelY - 15);
    ctx.lineTo(fishPixelX - 45, fishPixelY + 15);
    ctx.closePath();
    ctx.fill();

    // Boca do peixe (à direita) - indicador visual
    ctx.fillStyle = fish.state === "moving" ? "#ff0000" : "#333";
    ctx.beginPath();
    ctx.arc(fishPixelX + 30, fishPixelY, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Olho do peixe
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(fishPixelX + 10, fishPixelY - 5, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(fishPixelX + 12, fishPixelY - 5, 2, 0, 2 * Math.PI);
    ctx.fill();

    // 3. Área da água (acima do peixe)
    ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
    ctx.strokeStyle = isAdmin ? "#333" : "transparent";
    ctx.lineWidth = 2;

    drawWaterArea(ctx);

    // 4. Anzol (se ativo)
    if (hook.active) {
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.arc(hook.x, hook.y, 8, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Debug info para admins
    if (isAdmin) {
      ctx.fillStyle = "white";
      ctx.font = "14px monospace";

      const fishMouthX = fish.x + 0.03;
      const fishMouthY = fish.y;

      ctx.fillText(
        `Fish Center: (${fish.x.toFixed(2)}, ${fish.y.toFixed(2)}) - ${fish.state}`,
        10,
        30,
      );
      ctx.fillText(
        `Fish Mouth: (${fishMouthX.toFixed(2)}, ${fishMouthY.toFixed(2)})`,
        10,
        50,
      );
      ctx.fillText(
        `Hook: (${(hook.x / window.innerWidth).toFixed(2)}, ${(hook.y / window.innerHeight).toFixed(2)}) - ${hook.active ? "active" : "inactive"}`,
        10,
        70,
      );
      ctx.fillText(
        `Water: ${waterArea.shape} at (${waterArea.x}, ${waterArea.y})`,
        10,
        90,
      );

      // Verificar se peixe está na água
      const fishPixelX = fish.x * canvas.width;
      const fishPixelY = fish.y * canvas.height;
      const isFishInWater = isPointInWaterArea(fishPixelX, fishPixelY);
      const isHookInWater = hook.active
        ? isPointInWaterArea(hook.x, hook.y)
        : false;

      ctx.fillText(
        `Fish in water: ${isFishInWater}, Hook in water: ${isHookInWater}`,
        10,
        110,
      );
    }
  };

  // Desenhar área da água
  const drawWaterArea = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();

    switch (waterArea.shape) {
      case "rectangle":
      case "square":
        ctx.rect(waterArea.x, waterArea.y, waterArea.width, waterArea.height);
        break;

      case "circle":
        const centerX = waterArea.x + waterArea.width / 2;
        const centerY = waterArea.y + waterArea.height / 2;
        const radius = Math.min(waterArea.width, waterArea.height) / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        break;

      case "triangle":
        const tx1 = waterArea.x + waterArea.width / 2;
        const ty1 = waterArea.y;
        const tx2 = waterArea.x;
        const ty2 = waterArea.y + waterArea.height;
        const tx3 = waterArea.x + waterArea.width;
        const ty3 = waterArea.y + waterArea.height;

        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.lineTo(tx3, ty3);
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.stroke();
  };

  // Loop de animação
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      updateFishPosition(deltaTime);
      render(ctx);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fish, waterArea, hook, fishingSettings, isAdmin]);

  // Handlers para arrastar área da água (admin)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAdmin) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Verificar se clicou na área da água
    if (isPointInWaterArea(x, y)) {
      setIsDragging(true);
      setDragOffset({
        x: x - waterArea.x,
        y: y - waterArea.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isAdmin || !isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setWaterArea((prev) => ({
      ...prev,
      x: x - dragOffset.x,
      y: y - dragOffset.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#ffffff",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Canvas principal */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          cursor:
            isAdmin && isDragging ? "grabbing" : isAdmin ? "grab" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Fishing Rod Component */}
      <FishingRod
        waterArea={{
          x: waterArea.x / window.innerWidth,
          y: waterArea.y / window.innerHeight,
          width: waterArea.width / window.innerWidth,
          height: waterArea.height / window.innerHeight,
          shape: waterArea.shape,
        }}
        onHookCast={handleHookCast}
        onLineReeled={handleLineReeled}
      />

      {/* Back Button */}
      <button
        onClick={() => setCurrentScreen("exploration")}
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          zIndex: 30,
          background: "rgba(255, 255, 255, 0.9)",
          border: "1px solid #e5e5e5",
          borderRadius: "8px",
          padding: "10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          color: "#000000",
        }}
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      {/* Admin Controls */}
      {isAdmin && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 20,
            background: "rgba(255, 255, 255, 0.9)",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #e5e5e5",
            minWidth: "250px",
          }}
        >
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Controles de Admin
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Forma da Água:
            </label>
            <select
              value={waterArea.shape}
              onChange={(e) =>
                setWaterArea((prev) => ({
                  ...prev,
                  shape: e.target.value as WaterArea["shape"],
                }))
              }
              style={{ width: "100%", padding: "5px" }}
            >
              <option value="rectangle">Retângulo</option>
              <option value="square">Quadrado</option>
              <option value="circle">Círculo</option>
              <option value="triangle">Triângulo</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Largura: {waterArea.width}px
            </label>
            <input
              type="range"
              min="100"
              max="1000"
              value={waterArea.width}
              onChange={(e) =>
                setWaterArea((prev) => ({
                  ...prev,
                  width: parseInt(e.target.value),
                }))
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Altura: {waterArea.height}px
            </label>
            <input
              type="range"
              min="100"
              max="600"
              value={waterArea.height}
              onChange={(e) =>
                setWaterArea((prev) => ({
                  ...prev,
                  height: parseInt(e.target.value),
                }))
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            💡 Arraste a área da água para reposicionar
          </div>
        </div>
      )}

      {/* Modal de Jogo de Pesca */}
      {showFishingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "400px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#333", fontSize: "24px" }}>
              🎣 Peixe Fisgado!
            </h2>
            <p
              style={{ color: "#666", marginBottom: "30px", fontSize: "16px" }}
            >
              Parabéns! Você conseguiu fisgar um peixe.
            </p>

            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => {
                  setShowFishingModal(false);
                  setFish((prev) => ({ ...prev, state: "swimming" }));
                  setHook({ x: 0, y: 0, active: false });
                }}
                style={{
                  background: "#4A90E2",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Continuar Pescando
              </button>

              <button
                onClick={() => {
                  setShowFishingModal(false);
                  setFish((prev) => ({ ...prev, state: "swimming" }));
                  setHook({ x: 0, y: 0, active: false });
                }}
                style={{
                  background: "#ccc",
                  color: "#333",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
