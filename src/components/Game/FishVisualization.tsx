import React, { useEffect, useRef } from "react";

interface FishVisualizationProps {
  waterArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visibleFish: Array<{
    id: string;
    x: number;
    y: number;
    species: "Peixinho Azul" | "Peixinho Verde";
    size: number;
  }>;
}

export const FishVisualization: React.FC<FishVisualizationProps> = ({
  waterArea,
  visibleFish,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustar tamanho do canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Função de renderização
    const render = () => {
      // Limpar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Renderizar cada peixe
      visibleFish.forEach((fish) => {
        const x = fish.x * canvas.width;
        const y = fish.y * canvas.height;

        // Verificar se está na área de água
        const waterLeft = waterArea.x * canvas.width;
        const waterTop = waterArea.y * canvas.height;
        const waterRight = waterLeft + waterArea.width * canvas.width;
        const waterBottom = waterTop + waterArea.height * canvas.height;

        if (
          x >= waterLeft &&
          x <= waterRight &&
          y >= waterTop &&
          y <= waterBottom
        ) {
          // Cor baseada na espécie
          ctx.fillStyle =
            fish.species === "Peixinho Azul" ? "#4A90E2" : "#4CAF50";

          // Tamanho baseado no size do peixe
          const radius = 8 + fish.size * 2;

          // Desenhar peixe
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();

          // Adicionar borda
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Adicionar emoji do peixe
          ctx.fillStyle = "#fff";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            fish.species === "Peixinho Azul" ? "🐟" : "🐠",
            x,
            y + 4,
          );
        }
      });

      // Continuar animação
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Iniciar renderização
    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [waterArea, visibleFish]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 15, // Acima da água, abaixo dos controles
      }}
    />
  );
};
