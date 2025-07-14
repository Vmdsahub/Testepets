import React, { useEffect, useRef } from "react";

interface FishingRodProps {
  className?: string;
}

// Classe do sistema de pesca baseada no simulador fornecido
class FishingSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mouseX = 0;
  private mouseY = 0;
  private isLineOut = false;
  private isReelingIn = false;
  private reelStartTime = 0;
  private linePoints: Array<{
    x: number;
    y: number;
    oldX: number;
    oldY: number;
    pinned: boolean;
    targetX: number;
    targetY: number;
    finalTargetX: number;
    finalTargetY: number;
    initialProgress: number;
    castProgress: number;
    castPhase: string;
    castSpeed: number;
    castDelay: number;
    inWater: boolean;
    reelProgress: number;
    settled: boolean;
    settledX: number;
    settledY: number;
    velocityX: number;
    velocityY: number;
  }> = [];
  private targetX = 0;
  private targetY = 0;
  private fishingRodTip = { x: 0, y: 0 };
  private castStartTime = 0;

  // Sistema de força de lançamento
  private isCharging = false;
  private chargeStartTime = 0;
  private chargePower = 0;
  private readonly maxChargeTime = 2000; // 2 segundos para força máxima
  private readonly maxDistance = 0.55; // 55% da tela

  // Configurações da física da linha
  private readonly gravity = 0.3;
  private readonly damping = 0.98;
  private readonly waterDamping = 0.85; // Damping maior quando na água
  private readonly segmentLength = 15;
  private readonly numSegments = 20;
  private readonly waterLevel = 0.6; // 60% da altura da tela é considerado água

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Não foi possível obter o contexto 2D do canvas");
    }
    this.ctx = context;

    this.setupCanvas();
    this.bindEvents();
    this.startRenderLoop();
  }

  private setupCanvas() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private bindEvents() {
    // Eventos do mouse
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener("mousedown", () => {
      if (!this.isLineOut) {
        this.isCharging = true;
        this.chargeStartTime = Date.now();
      } else {
        this.reelIn();
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (this.isCharging && !this.isLineOut) {
        this.castLine(e.clientX, e.clientY);
        this.isCharging = false;
      }
    });

    // Cancelar carregamento se o mouse sair da tela
    window.addEventListener("mouseleave", () => {
      this.isCharging = false;
    });
  }

  // Funções de easing para suavizar as animações
  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private castLine(x: number, y: number) {
    this.isLineOut = true;
    this.castStartTime = Date.now();

    // Calcular força baseada no tempo de carregamento
    const chargeTime = Date.now() - this.chargeStartTime;
    this.chargePower = Math.min(chargeTime / this.maxChargeTime, 1);

    const startX = this.fishingRodTip.x;
    const startY = this.fishingRodTip.y;

    // Calcular direção do lançamento
    const dirX = x - startX;
    const dirY = y - startY;
    const distance = Math.sqrt(dirX * dirX + dirY * dirY);

    // Aplicar força e limite máximo
    const maxDistancePixels =
      Math.min(window.innerWidth, window.innerHeight) * this.maxDistance;
    const actualDistance = Math.min(
      distance * this.chargePower,
      maxDistancePixels,
    );

    // Calcular posição final
    if (distance > 0) {
      const normalizedX = dirX / distance;
      const normalizedY = dirY / distance;
      this.targetX = startX + normalizedX * actualDistance;
      this.targetY = startY + normalizedY * actualDistance;
    } else {
      this.targetX = startX;
      this.targetY = startY + actualDistance;
    }

    // Pontos de controle para o arco do lançamento
    const controlX = startX + (this.targetX - startX) * 0.4;
    const arcHeight = actualDistance * (0.3 + this.chargePower * 0.2);
    const controlY = Math.min(startY, this.targetY) - arcHeight;

    // Inicializar segmentos da linha gradualmente
    this.linePoints = [];

    for (let i = 0; i < this.numSegments; i++) {
      const t = i / (this.numSegments - 1);

      // Usar curva quadrática para determinar o caminho do lançamento
      const arcX =
        (1 - t) * (1 - t) * startX +
        2 * (1 - t) * t * controlX +
        t * t * this.targetX;
      const arcY =
        (1 - t) * (1 - t) * startY +
        2 * (1 - t) * t * controlY +
        t * t * this.targetY;

      this.linePoints.push({
        x: startX,
        y: startY,
        oldX: startX,
        oldY: startY,
        pinned: i === 0,
        targetX: arcX,
        targetY: arcY,
        finalTargetX: startX + (this.targetX - startX) * t,
        finalTargetY: startY + (this.targetY - startY) * t,
        initialProgress: 0,
        castProgress: 0,
        castPhase: "arc",
        castSpeed: 0.012 + i * 0.001,
        castDelay: i * 30,
        inWater: false,
        reelProgress: 0,
        settled: false,
        settledX: 0,
        settledY: 0,
        velocityX: 0,
        velocityY: 0,
      });
    }
  }

  private reelIn() {
    if (!this.isLineOut || this.isReelingIn) return;

    this.isReelingIn = true;
    this.reelStartTime = Date.now();

    // Marcar todos os pontos para recolhimento
    this.linePoints.forEach((point) => {
      point.reelProgress = 0;
      point.castPhase = "reeling";
      point.settled = false; // Resetar estado assentado para permitir movimento
    });
  }

  private updateReeling() {
    const reelTime = Date.now() - this.reelStartTime;
    const reelDuration = 2000; // 2 segundos para recolher totalmente
    const reelProgress = Math.min(reelTime / reelDuration, 1);

    // Recolher pontos de trás para frente (do anzol para a vara)
    for (let i = this.linePoints.length - 1; i >= 0; i--) {
      const point = this.linePoints[i];
      if (point.pinned) continue;

      // Calcular progresso de recolhimento com delay baseado na distância da vara
      const delayFactor =
        (this.linePoints.length - 1 - i) / this.linePoints.length;
      const adjustedProgress = Math.max(0, reelProgress - delayFactor * 0.3);

      if (adjustedProgress > 0) {
        point.reelProgress = this.easeOutQuart(adjustedProgress);

        // Mover o ponto em direção à vara
        const targetX = this.fishingRodTip.x;
        const targetY = this.fishingRodTip.y;

        point.x = point.x + (targetX - point.x) * point.reelProgress * 0.1;
        point.y = point.y + (targetY - point.y) * point.reelProgress * 0.1;
      }
    }

    // Aplicar restrições de distância durante o recolhimento
    for (let iteration = 0; iteration < 2; iteration++) {
      for (let i = 0; i < this.linePoints.length - 1; i++) {
        const pointA = this.linePoints[i];
        const pointB = this.linePoints[i + 1];

        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.segmentLength) {
          const difference = this.segmentLength - distance;
          const percent = difference / distance / 2;
          const offsetX = dx * percent;
          const offsetY = dy * percent;

          if (!pointA.pinned && !pointA.settled) {
            pointA.x -= offsetX;
            pointA.y -= offsetY;
          }
          if (!pointB.pinned && !pointB.settled) {
            pointB.x += offsetX;
            pointB.y += offsetY;
          }
        }
      }
    }

    // Manter conexão com a vara
    if (this.linePoints.length > 0) {
      this.linePoints[0].x = this.fishingRodTip.x;
      this.linePoints[0].y = this.fishingRodTip.y;
    }

    // Finalizar recolhimento quando completo
    if (reelProgress >= 1) {
      this.isLineOut = false;
      this.isReelingIn = false;
      this.linePoints = [];
    }
  }

  private updateLinePhysics() {
    if (!this.isLineOut || this.linePoints.length === 0) return;

    // Processar recolhimento se estiver acontecendo
    if (this.isReelingIn) {
      this.updateReeling();
      return;
    }

    // Atualizar posições com Verlet integration
    for (let i = 0; i < this.linePoints.length; i++) {
      const point = this.linePoints[i];

      if (!point.pinned) {
        const timeSinceCast = Date.now() - this.castStartTime;

        if (timeSinceCast < point.castDelay) {
          continue;
        }

        // Animação de lançamento progressivo
        if (point.castProgress < 1) {
          point.castProgress += point.castSpeed;
          if (point.castProgress > 1) {
            point.castProgress = 1;

            if (point.castPhase === "arc") {
              point.castPhase = "fall";
              point.castProgress = 0;
              point.initialProgress = 0;
              point.oldX = point.x;
              point.oldY = point.y;
              point.targetX = point.finalTargetX;
              point.targetY = point.finalTargetY;
              point.castSpeed = point.castSpeed * 0.9;
            }
          }

          if (point.castPhase === "arc") {
            const eased = this.easeOutQuart(point.castProgress);
            point.x = point.oldX + (point.targetX - point.oldX) * eased;
            point.y = point.oldY + (point.targetY - point.oldY) * eased;
          } else if (point.castPhase === "fall") {
            point.initialProgress += 0.008;
            const progress = point.initialProgress + point.castProgress;
            const easedProgress = Math.min(1, progress * progress * 0.9);

            point.x = point.oldX + (point.targetX - point.oldX) * easedProgress;
            point.y = point.oldY + (point.targetY - point.oldY) * easedProgress;

            const fallProgress = point.castProgress / 2;
            const wobble = Math.sin(fallProgress * 5) * 2 * (1 - fallProgress);
            point.x += wobble;
          }
        } else {
          // Física normal após o lançamento

          // Verificar se o ponto está na água
          const isInWater = point.y > window.innerHeight * this.waterLevel;
          point.inWater = isInWater;

          // Se o ponto já está assentado, manter posição fixa
          if (point.settled) {
            point.x = point.settledX;
            point.y = point.settledY;
            point.oldX = point.settledX;
            point.oldY = point.settledY;
          } else {
            // Aplicar damping diferente se estiver na água
            const currentDamping = isInWater ? this.waterDamping : this.damping;
            const currentGravity = isInWater
              ? this.gravity * 0.3
              : this.gravity;

            const velX = (point.x - point.oldX) * currentDamping;
            const velY = (point.y - point.oldY) * currentDamping;

            // Armazenar velocidades para detectar quando parar
            point.velocityX = velX;
            point.velocityY = velY;

            point.oldX = point.x;
            point.oldY = point.y;

            point.x += velX;
            point.y += velY + currentGravity;

            // Verificar se deve assentar (quando na água e com velocidade baixa)
            if (isInWater) {
              const speed = Math.sqrt(velX * velX + velY * velY);
              if (speed < 0.5) {
                // Velocidade baixa, assentar
                point.settled = true;
                point.settledX = point.x;
                point.settledY = point.y;
              }
            }
          }
        }
      }
    }

    // Aplicar restrições de distância
    for (let iteration = 0; iteration < 3; iteration++) {
      for (let i = 0; i < this.linePoints.length - 1; i++) {
        const pointA = this.linePoints[i];
        const pointB = this.linePoints[i + 1];

        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const difference = this.segmentLength - distance;
          const percent = difference / distance / 2;
          const offsetX = dx * percent;
          const offsetY = dy * percent;

          if (!pointA.pinned && !pointA.settled) {
            pointA.x -= offsetX;
            pointA.y -= offsetY;
          }
          if (!pointB.pinned && !pointB.settled) {
            pointB.x += offsetX;
            pointB.y += offsetY;
          }
        }
      }
    }

    // Manter o primeiro ponto na ponta da vara
    if (this.linePoints.length > 0) {
      this.linePoints[0].x = this.fishingRodTip.x;
      this.linePoints[0].y = this.fishingRodTip.y;
    }
  }

  private updateChargePower() {
    if (this.isCharging) {
      const chargeTime = Date.now() - this.chargeStartTime;
      this.chargePower = Math.min(chargeTime / this.maxChargeTime, 1);
    }
  }

  private drawFishingElements() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calcular posição da vara baseada no mouse
    const rodLength = 120;
    const rodBaseX = window.innerWidth / 2;
    const rodBaseY = window.innerHeight - 100;

    const angle = Math.atan2(this.mouseY - rodBaseY, this.mouseX - rodBaseX);
    const rodTipX = rodBaseX + Math.cos(angle) * rodLength;
    const rodTipY = rodBaseY + Math.sin(angle) * rodLength;

    this.fishingRodTip.x = rodTipX;
    this.fishingRodTip.y = rodTipY;

    // Desenhar indicador de força se estiver carregando
    if (this.isCharging) {
      const indicatorRadius = 30 + this.chargePower * 20;
      const alpha = 0.3 + this.chargePower * 0.4;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = `hsl(${120 - this.chargePower * 60}, 80%, 50%)`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(rodTipX, rodTipY, indicatorRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Desenhar linha de mira
      this.ctx.globalAlpha = 0.6;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(rodTipX, rodTipY);

      // Calcular posição de mira com força atual
      const dirX = this.mouseX - rodTipX;
      const dirY = this.mouseY - rodTipY;
      const distance = Math.sqrt(dirX * dirX + dirY * dirY);
      const maxDistancePixels =
        Math.min(window.innerWidth, window.innerHeight) * this.maxDistance;
      const actualDistance = Math.min(
        distance * this.chargePower,
        maxDistancePixels,
      );

      if (distance > 0) {
        const normalizedX = dirX / distance;
        const normalizedY = dirY / distance;
        const aimX = rodTipX + normalizedX * actualDistance;
        const aimY = rodTipY + normalizedY * actualDistance;
        this.ctx.lineTo(aimX, aimY);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.restore();
    }

    // Desenhar vara de pesca
    this.ctx.strokeStyle = "#8B4513";
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(rodBaseX, rodBaseY);
    this.ctx.lineTo(rodTipX, rodTipY);
    this.ctx.stroke();

    // Desenhar cabo da vara
    this.ctx.strokeStyle = "#654321";
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(rodBaseX, rodBaseY);
    this.ctx.lineTo(
      rodBaseX + Math.cos(angle) * 25,
      rodBaseY + Math.sin(angle) * 25,
    );
    this.ctx.stroke();

    // Desenhar linha de pesca
    if (this.isLineOut && this.linePoints.length > 0) {
      this.ctx.strokeStyle = "#333";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.linePoints[0].x, this.linePoints[0].y);

      for (let i = 1; i < this.linePoints.length; i++) {
        const currPoint = this.linePoints[i];

        if (i < this.linePoints.length - 1) {
          const nextPoint = this.linePoints[i + 1];
          const cpX = currPoint.x;
          const cpY = currPoint.y;
          const endX = (currPoint.x + nextPoint.x) / 2;
          const endY = (currPoint.y + nextPoint.y) / 2;
          this.ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        } else {
          this.ctx.lineTo(currPoint.x, currPoint.y);
        }
      }
      this.ctx.stroke();

      // Desenhar anzol
      if (this.linePoints.length > 0) {
        const lastPoint = this.linePoints[this.linePoints.length - 1];
        this.ctx.fillStyle = "#666";
        this.ctx.beginPath();
        this.ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Desenhar formato do anzol
        this.ctx.strokeStyle = "#444";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(lastPoint.x, lastPoint.y + 3, 6, 0, Math.PI);
        this.ctx.moveTo(lastPoint.x + 6, lastPoint.y + 3);
        this.ctx.lineTo(lastPoint.x + 4, lastPoint.y - 1);
        this.ctx.stroke();
      }
    }
  }

  private render = () => {
    this.updateChargePower();
    this.updateLinePhysics();
    this.drawFishingElements();
    requestAnimationFrame(this.render);
  };

  private startRenderLoop() {
    this.render();
  }

  public destroy() {
    // Cleanup se necessário
  }
}

export const FishingRod: React.FC<FishingRodProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishingSystemRef = useRef<FishingSystem | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        fishingSystemRef.current = new FishingSystem(canvasRef.current);
      } catch (error) {
        console.error("Erro ao inicializar sistema de pesca:", error);
      }
    }

    return () => {
      if (fishingSystemRef.current) {
        fishingSystemRef.current.destroy();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 15,
        pointerEvents: "auto",
        cursor: "crosshair",
      }}
    />
  );
};
