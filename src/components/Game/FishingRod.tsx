import React, { useEffect, useRef } from "react";

interface WaterArea {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "rectangle" | "circle" | "triangle";
}

interface FishingRodProps {
  className?: string;
  onHookCast?: (x: number, y: number) => void;
  onLineReeled?: () => void;
  waterArea?: WaterArea;
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
  private fishingRodImage: HTMLImageElement | null = null;
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
    wasInWater: boolean; // Para detectar quando acabou de entrar na água
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
  private previousRodTip = { x: 0, y: 0 };
  private castStartTime = 0;
  private onHookCast?: (x: number, y: number) => void;
  private onLineReeled?: () => void;
  private waterArea?: WaterArea;

  // Sistema de força de lançamento
  private isCharging = false;
  private chargeStartTime = 0;
  private chargePower = 0;
  private readonly maxChargeTime = 2000; // 2 segundos para força m��xima
  private readonly maxDistance = 0.55; // 55% da tela

  // Configurações da física da linha
  private readonly gravity = 0.3;
  private readonly damping = 0.98;
  private readonly waterDamping = 0.85; // Damping maior quando na água
  private readonly segmentLength = 15;
  private readonly numSegments = 20;
  private readonly waterLevel = 0.6; // 60% da altura da tela é considerado água

  constructor(
    canvas: HTMLCanvasElement,
    onHookCast?: (x: number, y: number) => void,
    onLineReeled?: () => void,
    waterArea?: WaterArea,
  ) {
    this.canvas = canvas;
    this.onHookCast = onHookCast;
    this.onLineReeled = onLineReeled;
    this.waterArea = waterArea;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Não foi possível obter o contexto 2D do canvas");
    }
    this.ctx = context;

    this.loadFishingRodImage();
    this.setupCanvas();
    this.bindEvents();
    this.startRenderLoop();
  }

  private loadFishingRodImage() {
    this.fishingRodImage = new Image();
    this.fishingRodImage.crossOrigin = "anonymous";
    this.fishingRodImage.onload = () => {
      console.log("Fishing rod image loaded successfully");
    };
    this.fishingRodImage.onerror = () => {
      console.error("Failed to load fishing rod image");
      this.fishingRodImage = null;
    };
    this.fishingRodImage.src =
      "https://cdn.builder.io/api/v1/image/assets%2F93c9d9ee317e46338402a7682b8e50f7%2F046a923883bd4f9a9603e2c3d3dab8f3?format=webp&width=800";
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
        // Verificar se o clique está dentro da área de água antes de lançar
        if (this.isPointInWaterArea(e.clientX, e.clientY)) {
          this.castLine(e.clientX, e.clientY);
        }
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

  // Verificar se um ponto (em pixels) está dentro da área de água configurada
  private isPointInWaterArea(pixelX: number, pixelY: number): boolean {
    // Se não há área configurada, usar detecção original (60% da altura)
    if (!this.waterArea) {
      return pixelY > window.innerHeight * this.waterLevel;
    }

    // Converter pixels para coordenadas relativas (0-1)
    const relX = pixelX / window.innerWidth;
    const relY = pixelY / window.innerHeight;

    const { x, y, width, height, shape } = this.waterArea;

    switch (shape) {
      case "rectangle":
        return (
          relX >= x && relX <= x + width && relY >= y && relY <= y + height
        );

      case "circle": {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) / 2;
        const distance = Math.sqrt(
          (relX - centerX) ** 2 + (relY - centerY) ** 2,
        );
        return distance <= radius;
      }

      case "triangle": {
        // Triângulo: topo centro, base esquerda, base direita
        const tx1 = x + width / 2; // Topo centro
        const ty1 = y;
        const tx2 = x; // Base esquerda
        const ty2 = y + height;
        const tx3 = x + width; // Base direita
        const ty3 = y + height;

        // Algoritmo de área para verificar se ponto está dentro do triângulo
        const area = Math.abs(
          (tx2 - tx1) * (ty3 - ty1) - (tx3 - tx1) * (ty2 - ty1),
        );
        const area1 = Math.abs(
          (relX - tx2) * (ty3 - ty2) - (tx3 - tx2) * (relY - ty2),
        );
        const area2 = Math.abs(
          (tx1 - relX) * (relY - ty1) - (relX - tx1) * (ty1 - relY),
        );
        const area3 = Math.abs(
          (tx2 - tx1) * (relY - ty1) - (relX - tx1) * (ty2 - ty1),
        );

        return Math.abs(area - (area1 + area2 + area3)) < 0.001;
      }

      default:
        return false;
    }
  }

  // Método auxiliar para verificar pontos da linha (que já estão em pixels)
  private isLinePointInWaterArea(pixelX: number, pixelY: number): boolean {
    // Se não há área configurada, usar detecção original (60% da altura)
    if (!this.waterArea) {
      return pixelY > window.innerHeight * this.waterLevel;
    }

    // Converter pixels para coordenadas relativas (0-1)
    const relX = pixelX / window.innerWidth;
    const relY = pixelY / window.innerHeight;

    const { x, y, width, height, shape } = this.waterArea;

    switch (shape) {
      case "rectangle":
        return (
          relX >= x && relX <= x + width && relY >= y && relY <= y + height
        );

      case "circle": {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) / 2;
        const distance = Math.sqrt(
          (relX - centerX) ** 2 + (relY - centerY) ** 2,
        );
        return distance <= radius;
      }

      case "triangle": {
        // Triângulo: topo centro, base esquerda, base direita
        const tx1 = x + width / 2; // Topo centro
        const ty1 = y;
        const tx2 = x; // Base esquerda
        const ty2 = y + height;
        const tx3 = x + width; // Base direita
        const ty3 = y + height;

        // Algoritmo de área para verificar se ponto está dentro do triângulo
        const area = Math.abs(
          (tx2 - tx1) * (ty3 - ty1) - (tx3 - tx1) * (ty2 - ty1),
        );
        const area1 = Math.abs(
          (relX - tx2) * (ty3 - ty2) - (tx3 - tx2) * (relY - ty2),
        );
        const area2 = Math.abs(
          (tx1 - relX) * (relY - ty1) - (relX - tx1) * (ty1 - relY),
        );
        const area3 = Math.abs(
          (tx2 - tx1) * (relY - ty1) - (relX - tx1) * (ty2 - ty1),
        );

        return Math.abs(area - (area1 + area2 + area3)) < 0.001;
      }

      default:
        return false;
    }
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

    // Para lances dentro da área de água, usar posição exata do clique
    // Para lances fora da área, aplicar limites tradicionais
    const isTargetInWaterArea = this.isPointInWaterArea(x, y);

    if (isTargetInWaterArea) {
      // Se o alvo está na área de água, ir exatamente para lá
      this.targetX = x;
      this.targetY = y;
    } else {
      // Para alvos fora da área, usar sistema original com limites
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
    }

    // Pontos de controle para o arco do lançamento
    const controlX = startX + (this.targetX - startX) * 0.4;

    // Calcular altura do arco baseada na distância real ao alvo
    const realDistance = Math.sqrt(
      (this.targetX - startX) ** 2 + (this.targetY - startY) ** 2,
    );
    const arcHeight = isTargetInWaterArea
      ? realDistance * 0.25 // Arco mais baixo para lances precisos na água
      : realDistance * (0.3 + this.chargePower * 0.2); // Arco original para outros lances

    const controlY = Math.min(startY, this.targetY) - arcHeight;

    // Callback será chamado quando anzol atingir posição final
    // Não chamar aqui pois posição final pode ser diferente após física

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
        wasInWater: false,
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

    // Notificar que a linha está sendo recolhida
    if (this.onLineReeled) {
      this.onLineReeled();
    }

    // Marcar todos os pontos para recolhimento
    this.linePoints.forEach((point) => {
      point.reelProgress = 0;
      point.castPhase = "reeling";
      point.settled = false; // Permitir movimento durante recolhimento
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

          if (!pointA.pinned) {
            pointA.x -= offsetX;
            pointA.y -= offsetY;
          }
          if (!pointB.pinned) {
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

          // Verificar se o ponto está na água usando área configurada
          const isInWater = this.isLinePointInWaterArea(point.x, point.y);
          const justEnteredWater = !point.wasInWater && isInWater;

          point.wasInWater = point.inWater;
          point.inWater = isInWater;

          // Se acabou de entrar na água, reduzir drasticamente a velocidade
          if (justEnteredWater) {
            const velX = point.x - point.oldX;
            const velY = point.y - point.oldY;

            // Reduzir velocidade vertical para quase zero
            point.oldX = point.x - velX * 0.1;
            point.oldY = point.y - velY * 0.05; // Reduzir velocidade vertical drasticamente
          }

          // Se o ponto está assentado, aplicar movimento muito reduzido
          if (point.settled) {
            // Movimento muito sutil quando assentado
            const settledDamping = 0.92;
            const velX = (point.x - point.oldX) * settledDamping;
            const velY = (point.y - point.oldY) * settledDamping;

            point.oldX = point.x;
            point.oldY = point.y;

            // Permitir movimento m��nimo
            point.x += velX * 0.1;
            point.y += velY * 0.1;

            // Manter próximo à posição assentada
            const pullX = (point.settledX - point.x) * 0.05;
            const pullY = (point.settledY - point.y) * 0.05;
            point.x += pullX;
            point.y += pullY;

            // Pequena oscilação na água
            const time = Date.now() * 0.001;
            const waterWave = Math.sin(time * 1.5 + point.x * 0.01) * 0.3;
            point.y += waterWave;
          } else {
            // Aplicar física normal
            const currentDamping = isInWater ? 0.5 : this.damping; // Damping muito mais forte na água
            const currentGravity = isInWater
              ? this.gravity * 0.02 // Gravidade quase zero na água
              : this.gravity;

            const velX = (point.x - point.oldX) * currentDamping;
            const velY = (point.y - point.oldY) * currentDamping;

            point.oldX = point.x;
            point.oldY = point.y;

            point.x += velX;
            point.y += velY + currentGravity;

            // Verificar se deve assentar - ser muito mais responsivo quando entra na água
            if (isInWater) {
              const speed = Math.sqrt(velX * velX + velY * velY);
              // Assentar quase imediatamente ao entrar na água
              if (speed < 2.0) {
                point.settled = true;
                point.settledX = point.x;
                point.settledY = point.y;
              }

              // Adicionar oscilação suave na água
              const time = Date.now() * 0.001;
              const waterWave = Math.sin(time * 1.5 + point.x * 0.01) * 0.5;
              point.y += waterWave;
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

          if (!pointA.pinned) {
            pointA.x -= offsetX;
            pointA.y -= offsetY;
          }
          if (!pointB.pinned) {
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

    // Armazenar posição anterior para calcular movimento
    this.previousRodTip.x = this.fishingRodTip.x;
    this.previousRodTip.y = this.fishingRodTip.y;

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

    // Desenhar vara de pesca usando a nova imagem
    if (this.fishingRodImage && this.fishingRodImage.complete) {
      this.ctx.save();

      // Configurar transformação para posicionar e rotacionar a vara
      this.ctx.translate(rodBaseX, rodBaseY);
      // Ajustar rotação - a imagem é vertical, então subtraímos 90 graus
      this.ctx.rotate(angle - Math.PI / 2);
      // Flip vertical da imagem
      this.ctx.scale(1, -1);

      // Desenhar a imagem da vara com orientaç��o correta
      const rodImageLength = 128; // Comprimento definido para 128px
      const rodImageWidth = 120; // Largura definida para 120px
      this.ctx.drawImage(
        this.fishingRodImage,
        -rodImageWidth / 2,
        -rodImageLength,
        rodImageWidth,
        rodImageLength,
      );

      this.ctx.restore();
    } else {
      // Fallback: desenhar vara básica se a imagem não carregar
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
    }

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

  public updateWaterArea(newWaterArea?: WaterArea) {
    this.waterArea = newWaterArea;
  }

  public destroy() {
    // Cleanup se necessário
  }
}

export const FishingRod: React.FC<FishingRodProps> = ({
  className,
  onHookCast,
  onLineReeled,
  waterArea,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishingSystemRef = useRef<FishingSystem | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        fishingSystemRef.current = new FishingSystem(
          canvasRef.current,
          onHookCast,
          onLineReeled,
          waterArea,
        );
      } catch (error) {
        console.error("Erro ao inicializar sistema de pesca:", error);
      }
    }

    return () => {
      if (fishingSystemRef.current) {
        fishingSystemRef.current.destroy();
      }
    };
  }, [onHookCast, onLineReeled]);

  // UseEffect separado para atualizar waterArea quando ela mudar
  useEffect(() => {
    if (fishingSystemRef.current) {
      fishingSystemRef.current.updateWaterArea(waterArea);
    }
  }, [waterArea]);

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
