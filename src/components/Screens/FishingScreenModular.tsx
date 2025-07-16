import React, { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import {
  fishingSettingsService,
  FishingSettings,
} from "../../services/fishingSettingsService";
import { FishingRod } from "../Game/FishingRod";
import { fishingService } from "../../services/fishingService";

// Tipos para o sistema modular
interface WaterArea {
  x: number; // Posição X relativa (0-1)
  y: number; // Posição Y relativa (0-1)
  width: number; // Largura relativa (0-1)
  height: number; // Altura relativa (0-1)
  shape: "rectangle" | "circle" | "triangle";
}

// WebGL Water Effect Class Modular - NOVO: Movimento aleatório livre com rotação 360�� baseado na área definida
class ModularWaterEffect {
  constructor(waterArea, isAdmin = false) {
    // Inicializar activeTimers PRIMEIRO para evitar undefined
    this.activeTimers = [];

    this.canvas = document.getElementById("waterCanvas");
    this.waterArea = waterArea;
    this.isAdmin = isAdmin;

    if (!this.canvas) {
      console.warn("Canvas element not found");
      return;
    }

    this.gl =
      this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");

    if (!this.gl) {
      console.warn("WebGL não é suportado neste navegador");
      return;
    }

    this.program = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.backgroundTexture = null;
    this.noiseTexture = null;
    this.fishTexture = null;
    this.fish2Texture = null; // Textura do peixe verde

    this.uniforms = {};
    this.attributes = {};

    this.waveIntensity = 0.5;
    this.distortionAmount = 0.3;
    this.animationSpeed = 1.0;
    this.time = 0;
    this.fishTime = 0;

    // Estados do jogo de pesca
    this.gameState = "idle";
    this.hookPosition = { x: 0.5, y: 0.5 };
    // Peixe 1 (azul) - original
    this.fishTargetPosition = { x: 0.4, y: 0.6 };
    this.fishCurrentPosition = { x: 0.4, y: 0.6 }; // Posição atual real do peixe
    this.fishVelocity = { x: 0, y: 0 }; // Velocidade atual do peixe
    this.fishDirection = 1; // 1 = direita, -1 = esquerda (mantido para compatibilidade)
    this.fishAngle = 0; // ��ngulo real do peixe em radianos (0 = direita, PI = esquerda)

    // Peixe 2 (verde) - novo
    this.fish2TargetPosition = { x: 0.6, y: 0.7 };
    this.fish2CurrentPosition = { x: 0.6, y: 0.7 }; // Posição atual real do peixe 2
    this.fish2Velocity = { x: 0, y: 0 }; // Velocidade atual do peixe 2
    this.fish2Direction = -1; // Começa nadando para esquerda
    this.fish2Angle = 0; // Ângulo real do peixe 2

    // Sistema de movimento orgânico
    this.fishDesiredDirection = { x: 1, y: 0 }; // Direção desejada
    this.fishSpeed = 0.0006; // Velocidade base mais lenta
    this.directionChangeTime = 0; // Timer para mudança de direção
    this.directionChangeCooldown = 3000 + Math.random() * 4000; // 3-7 segundos entre mudanças (mais lento)

    // Sistema de movimento orgânico - Peixe 2 (verde)
    this.fish2DesiredDirection = { x: -1, y: 0 }; // Começa indo para esquerda
    this.fish2Speed = 0.0005; // Velocidade ligeiramente diferente
    this.fish2DirectionChangeTime = 1500; // Offset inicial
    this.fish2DirectionChangeCooldown = 3500 + Math.random() * 3500; // Timing diferente

    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.activeFish = 1; // Qual peixe est�� ativo (1 = azul, 2 = verde)
    this.originalFishMovement = { moveX: 0, moveY: 0 };
    this.exclamationTime = 0;
    this.exclamationStartTime = 0;
    this.canClickExclamation = false;
    this.onGameStart = null;
    this.onGameStartBackup = null; // Backup do callback
    this.onExclamationClick = null;
    this.fishTimeOffset = 0;
    this.transitionBackToNaturalTime = 0;
    this.transitionBackToNaturalDuration = 2000;
    this.transitionStartPosition = { x: 0.5, y: 0.65 };

    // Novos estados para melhorias
    this.showFisgadoText = false;
    this.fisgadoTextStartTime = 0;
    this.isVibrating = false;

    // Sistema de visibilidade e respawn
    this.fish1Visible = true; // Peixe azul visível
    this.fish2Visible = true; // Peixe verde visível
    this.fish1RespawnTime = 0; // Tempo para respawn do peixe azul
    this.fish2RespawnTime = 0; // Tempo para respawn do peixe verde

    this.init();
    this.render();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.createShaders();
    this.createGeometry();
    this.createTextures();
  }

  resizeCanvas() {
    if (!this.canvas || !this.gl) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  createShaders() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      void main() {
        v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
        v_position = a_position;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform float u_time;
      uniform float u_fishTime;
      uniform float u_waveIntensity;
      uniform float u_distortionAmount;
      uniform vec2 u_resolution;
      uniform float u_gameState;
      uniform vec2 u_hookPosition;
      uniform vec2 u_fishTargetPosition;
      uniform float u_showExclamation;
            uniform float u_fishTimeOffset;
      uniform float u_transitionSmoothing;
      uniform vec2 u_transitionStartPosition;
            uniform float u_fishDirection; // 1.0 = direita, -1.0 = esquerda (compatibilidade)
      uniform float u_fishAngle; // Ângulo real do peixe em radianos
      
            // Uniforms para área da água modular
      uniform vec4 u_waterArea; // x, y, width, height (0-1)
      uniform float u_waterShape; // 0=rectangle, 1=circle, 2=triangle
      
            uniform sampler2D u_backgroundTexture;
      uniform sampler2D u_noiseTexture;
      uniform sampler2D u_fishTexture;
      uniform sampler2D u_fish2Texture;

            // Uniforms para o segundo peixe
            uniform vec2 u_fish2TargetPosition;
      uniform float u_fish2Direction;
      uniform float u_fish2Angle;
      uniform float u_activeFish;

      // Uniforms para visibilidade dos peixes
      uniform float u_fish1Visible; // 1.0 = visível, 0.0 = capturado
      uniform float u_fish2Visible; // 1.0 = visível, 0.0 = capturado
      
      varying vec2 v_texCoord;
      varying vec2 v_position;

      // Função de ruído simplex 2D (mantida original)
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Função para criar ondas realistas (mantida original)
      float createWaves(vec2 uv, float time) {
        float wave1 = sin(uv.x * 6.0 + time * 1.5) * 0.1;
        float wave2 = sin(uv.y * 8.0 + time * 2.0) * 0.08;
        float wave3 = sin((uv.x + uv.y) * 12.0 + time * 1.2) * 0.05;
        float wave4 = sin((uv.x - uv.y) * 10.0 + time * 1.8) * 0.06;
        
        float dist = length(uv - 0.5);
        float wave5 = sin(dist * 20.0 - time * 3.0) * 0.04;
        
        float noise1 = snoise(uv * 10.0 + time * 0.5) * 0.03;
        float noise2 = snoise(uv * 15.0 - time * 0.3) * 0.02;
        float noise3 = snoise(uv.yx * 12.0 + time * 0.7) * 0.025;
        
        return (wave1 + wave2 + wave3 + wave4 + wave5 + noise1 + noise2 + noise3) * u_waveIntensity;
      }

      // Função para calcular a refração (mantida original)
      vec2 calculateRefraction(vec2 uv, float time) {
        float waveHeight = createWaves(uv, time);
        vec2 epsilon = vec2(0.01, 0.0);
        float heightRight = createWaves(uv + epsilon.xy, time);
        float heightUp = createWaves(uv + epsilon.yx, time);
        vec2 gradient = vec2(heightRight - waveHeight, heightUp - waveHeight) / epsilon.x;
        return gradient * u_distortionAmount;
      }

      // Simulação de cáusticas (mantida original)
      float calculateCaustics(vec2 uv, float time) {
        vec2 causticsUV = uv * 15.0;
        float caustic1 = abs(sin(causticsUV.x + time * 2.0));
        float caustic2 = abs(sin(causticsUV.y + time * 1.5));
        float caustic3 = abs(sin((causticsUV.x + causticsUV.y) * 0.5 + time));
        float noise = snoise(causticsUV + time * 0.3);
        return pow(caustic1 * caustic2 * caustic3 + noise * 0.2, 2.0) * 0.3;
      }

      // Verificar se ponto está dentro da área da água
      bool isInWaterArea(vec2 uv) {
                float x = u_waterArea.x;
        float y = u_waterArea.y;
        float w = u_waterArea.z;
        float h = u_waterArea.w;
        
                if (u_waterShape < 0.5) { // rectangle
          return uv.x >= x && uv.x <= x + w && uv.y >= y && uv.y <= y + h;
                } else if (u_waterShape < 1.5) { // circle
          vec2 center = vec2(x + w * 0.5, y + h * 0.5);
          float radius = min(w, h) * 0.5;
          return distance(uv, center) <= radius;
        } else if (u_waterShape < 2.5) { // triangle
                    vec2 p1 = vec2(x + w * 0.5, y); // Topo centro
          vec2 p2 = vec2(x, y + h); // Base esquerda
          vec2 p3 = vec2(x + w, y + h); // Base direita
          
          // Verificação simples de triângulo
          float d1 = sign((uv.x - p2.x) * (p1.y - p2.y) - (p1.x - p2.x) * (uv.y - p2.y));
          float d2 = sign((uv.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (uv.y - p3.y));
          float d3 = sign((uv.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (uv.y - p1.y));
          
          bool has_neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
          bool has_pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
          
                    return !(has_neg && has_pos);
        }
        return false;
      }

            // Função para obter cor com peixe (mantida original)
            vec4 getColorWithFish(vec4 bgColor, vec2 coords, float fishX, float fishY, float fishAngle) {
        
        vec2 fishPos = vec2(fishX, fishY);
        vec2 fishSize = vec2(0.08, 0.06);

                                                                                        // SISTEMA COM ROTA��ÃO DIAGONAL: Aplicar rotação real nas coordenadas UV
        vec2 localUV = (coords - fishPos + fishSize * 0.5) / fishSize;

        // Converter para coordenadas centradas (-0.5 a 0.5)
        vec2 centeredUV = localUV - 0.5;

                // Aplicar rotação diagonal do u_fishAngle (valor do JavaScript)
        // Ajustar rotação baseado na direção para corrigir lado direito
        float rotationAngle = u_fishAngle;
        if (fishAngle > 1.5) {
            // Quando peixe nada para direita (flipado), inverter rotação
            rotationAngle = -rotationAngle;
        }
        float cosAngle = cos(rotationAngle);
        float sinAngle = sin(rotationAngle);

        // Matrix de rotação 2D
        vec2 rotatedUV = vec2(
            centeredUV.x * cosAngle - centeredUV.y * sinAngle,
            centeredUV.x * sinAngle + centeredUV.y * cosAngle
        );

        // Voltar para coordenadas 0-1
        vec2 fishUV = rotatedUV + 0.5;

        // Aplicar flip horizontal baseado na direção (fishAngle contém informação de flip)
        if (fishAngle > 1.5) {
            fishUV.x = 1.0 - fishUV.x; // Flip quando nada para direita
        }

                                                        // === RENDERIZAR SOMBRA SUAVE E DISPERSA DO PEIXE ===

        // Offset da sombra (ligeiramente para baixo e direita)
        vec2 shadowOffset = vec2(0.008, 0.015);

        // Criar m����ltiplas sombras dispersas para efeito suave
        float totalShadowAlpha = 0.0;
        vec3 totalShadowColor = vec3(0.0);

        // 4 sombras ligeiramente deslocadas para criar dispersão
        for(int i = 0; i < 4; i++) {
            float angle = float(i) * 1.57; // 90 graus entre cada sombra
            vec2 disperseOffset = vec2(cos(angle), sin(angle)) * 0.003; // Dispersão mínima

                        vec2 shadowPos = fishPos + shadowOffset + disperseOffset;
            vec2 shadowLocalUV = (coords - shadowPos + fishSize * 0.5) / fishSize;

            // Aplicar a mesma rotação diagonal na sombra
            vec2 shadowCenteredUV = shadowLocalUV - 0.5;
            vec2 shadowRotatedUV = vec2(
                shadowCenteredUV.x * cosAngle - shadowCenteredUV.y * sinAngle,
                shadowCenteredUV.x * sinAngle + shadowCenteredUV.y * cosAngle
            );
            vec2 shadowUV = shadowRotatedUV + 0.5;

            // Aplicar flip horizontal da sombra
            if (fishAngle > 1.5) {
                shadowUV.x = 1.0 - shadowUV.x;
            }

            // Verificar se está na área válida
            if (shadowUV.x >= 0.0 && shadowUV.x <= 1.0 && shadowUV.y >= 0.0 && shadowUV.y <= 1.0 && isInWaterArea(coords)) {
                vec4 shadowTexture = texture2D(u_fishTexture, shadowUV);
                if (shadowTexture.a > 0.05) {
                    // Sombra muito sutil e azulada
                    vec3 shadowTint = vec3(0.3, 0.4, 0.5) * 0.25; // Tom azul muito fraco
                    float shadowAlpha = shadowTexture.a * 0.08; // Muito transparente

                    totalShadowColor += shadowTint * shadowAlpha;
                    totalShadowAlpha += shadowAlpha;
                }
            }
        }

        // Aplicar sombra dispersa e sutil
        if (totalShadowAlpha > 0.0) {
            // Limitar intensidade máxima da sombra
            totalShadowAlpha = min(totalShadowAlpha, 0.2);
            bgColor = mix(bgColor, vec4(totalShadowColor / max(totalShadowAlpha, 0.01), 1.0), totalShadowAlpha);
        }

        // === RENDERIZAR PEIXE POR CIMA DA SOMBRA ===

        if (fishUV.x >= 0.0 && fishUV.x <= 1.0 && fishUV.y >= 0.0 && fishUV.y <= 1.0 && isInWaterArea(coords)) {
          vec4 fishColor = texture2D(u_fishTexture, fishUV);
          if (fishColor.a > 0.1) {
            bgColor = mix(bgColor, vec4(fishColor.rgb, 1.0), fishColor.a);
          }
        }

                return bgColor;
      }

            // Função para adicionar o segundo peixe por cima
      vec4 addSecondFish(vec4 bgColor, vec2 coords, float fish2X, float fish2Y, float fish2Angle) {
        vec2 fish2Pos = vec2(fish2X, fish2Y);
        vec2 fish2Size = vec2(0.08, 0.06);

        // Converter para coordenadas centradas (-0.5 a 0.5)
        vec2 centered2UV = (coords - fish2Pos + fish2Size * 0.5) / fish2Size - 0.5;

        // Aplicar rotação diagonal do segundo peixe
        float rotation2Angle = u_fish2Angle;
        if (fish2Angle > 1.5) {
            // Quando peixe 2 nada para direita (flipado), inverter rotação
            rotation2Angle = -rotation2Angle;
        }
        float cos2Angle = cos(rotation2Angle);
        float sin2Angle = sin(rotation2Angle);

        // Matrix de rotação 2D para peixe 2
        vec2 rotated2UV = vec2(
            centered2UV.x * cos2Angle - centered2UV.y * sin2Angle,
            centered2UV.x * sin2Angle + centered2UV.y * cos2Angle
        );

        // Voltar para coordenadas 0-1
        vec2 fish2UV = rotated2UV + 0.5;

        // Aplicar flip horizontal baseado na direção do peixe 2
        if (fish2Angle > 1.5) {
            fish2UV.x = 1.0 - fish2UV.x;
        }

        // === RENDERIZAR SOMBRA SUAVE E DISPERSA DO PEIXE 2 ===

        // Offset da sombra (ligeiramente para baixo e direita)
        vec2 shadow2Offset = vec2(0.008, 0.015);

        // Criar múltiplas sombras dispersas para efeito suave
        float totalShadow2Alpha = 0.0;
        vec3 totalShadow2Color = vec3(0.0);

        // 4 sombras ligeiramente deslocadas para criar dispersão
        for(int i = 0; i < 4; i++) {
            float angle = float(i) * 1.57; // 90 graus entre cada sombra
            vec2 disperseOffset = vec2(cos(angle), sin(angle)) * 0.003; // Dispersão mínima

            vec2 shadow2Pos = fish2Pos + shadow2Offset + disperseOffset;
            vec2 shadow2LocalUV = (coords - shadow2Pos + fish2Size * 0.5) / fish2Size;

            // Aplicar a mesma rotação diagonal na sombra do peixe 2
            vec2 shadow2CenteredUV = shadow2LocalUV - 0.5;
            vec2 shadow2RotatedUV = vec2(
                shadow2CenteredUV.x * cos2Angle - shadow2CenteredUV.y * sin2Angle,
                shadow2CenteredUV.x * sin2Angle + shadow2CenteredUV.y * cos2Angle
            );
            vec2 shadow2UV = shadow2RotatedUV + 0.5;

            // Aplicar flip horizontal da sombra do peixe 2
            if (fish2Angle > 1.5) {
                shadow2UV.x = 1.0 - shadow2UV.x;
            }

            // Verificar se está na área válida
            if (shadow2UV.x >= 0.0 && shadow2UV.x <= 1.0 && shadow2UV.y >= 0.0 && shadow2UV.y <= 1.0 && isInWaterArea(coords)) {
                vec4 shadow2Texture = texture2D(u_fish2Texture, shadow2UV);
                if (shadow2Texture.a > 0.05) {
                    // Sombra muito sutil e esverdeada para o peixe verde
                    vec3 shadow2Tint = vec3(0.3, 0.5, 0.4) * 0.25; // Tom verde muito fraco
                    float shadow2Alpha = shadow2Texture.a * 0.08; // Muito transparente

                    totalShadow2Color += shadow2Tint * shadow2Alpha;
                    totalShadow2Alpha += shadow2Alpha;
                }
            }
        }

        // Aplicar sombra dispersa e sutil do peixe 2
        if (totalShadow2Alpha > 0.0) {
            // Limitar intensidade máxima da sombra
            totalShadow2Alpha = min(totalShadow2Alpha, 0.2);
            bgColor = mix(bgColor, vec4(totalShadow2Color / max(totalShadow2Alpha, 0.01), 1.0), totalShadow2Alpha);
        }

        // === RENDERIZAR PEIXE 2 POR CIMA DA SOMBRA ===

        // Renderizar peixe 2 se estiver na área válida
        if (fish2UV.x >= 0.0 && fish2UV.x <= 1.0 && fish2UV.y >= 0.0 && fish2UV.y <= 1.0 && isInWaterArea(coords)) {
          vec4 fish2Color = texture2D(u_fish2Texture, fish2UV);
          if (fish2Color.a > 0.1) {
            bgColor = mix(bgColor, vec4(fish2Color.rgb, 1.0), fish2Color.a);
          }
        }

        return bgColor;
      }

      void main() {
        vec2 uv = v_texCoord;
        
                                                // === SISTEMA ORGÂNICO DE MOVIMENTO DO PEIXE - TOTALMENTE NOVO ===

        float time = u_fishTime;

        // Área da água
        float areaX = u_waterArea.x;
        float areaY = u_waterArea.y;
        float areaW = u_waterArea.z;
        float areaH = u_waterArea.w;

        // Centro da área
        float centerX = areaX + areaW * 0.5;
        float centerY = areaY + areaH * 0.5;

        // === SISTEMA DE ESTADOS COMPORTAMENTAIS ===
        float stateCycle = sin(time * 0.008) * 0.5 + 0.5; // Ciclo lento de 125 segundos

        float fishBehavior = 0.0;
        if (stateCycle > 0.7) {
            fishBehavior = 2.0; // ESTADO: Descansando (30%)
        } else if (stateCycle > 0.3) {
            fishBehavior = 1.0; // ESTADO: Explorando (40%)
        } else {
            fishBehavior = 0.0; // ESTADO: Nadando livre (30%)
        }

                                                                // === MOVIMENTO EVO FISH - VELÓCIDÃO E DINÂMICA ===

        float swimSpeed = 0.05; // Velocidade mais rápida como Evo Fish
        float t = time * swimSpeed;

        // Movimento circular principal mais rápido e dinâmico
        float mainRadius = min(areaW, areaH) * 0.4;
        float mainAngle = t * 0.8; // Circular mais rápido

        // Posição base do movimento circular
        float circleX = cos(mainAngle) * mainRadius;
        float circleY = sin(mainAngle) * mainRadius * 0.7; // Elipse

        // Variações de trajetória (como Evo Fish - movimentos imprevisíveis)
        float variation1X = sin(t * 1.5) * areaW * 0.15;
        float variation1Y = cos(t * 1.2) * areaH * 0.12;

        float variation2X = cos(t * 0.6 + 2.0) * areaW * 0.2;
        float variation2Y = sin(t * 0.7 + 1.5) * areaH * 0.18;

        // Movimento de "busca" rápido (característico do Evo Fish)
        float searchX = sin(t * 2.2) * areaW * 0.1;
        float searchY = cos(t * 1.8) * areaH * 0.08;

        // Acelerações súbitas (como quando peixes vêem comida)
        float burstSpeed = 1.0 + sin(t * 0.3) * 0.4; // Varia de 0.6x a 1.4x

        // Combinar todos os movimentos
        float baseX = centerX + (circleX + variation1X + variation2X + searchX) * burstSpeed;
        float baseY = centerY + (circleY + variation1Y + variation2Y + searchY) * burstSpeed;

                        // Suavização para evitar teleporte entre padrões
        float transitionSmooth = 0.95; // Suavização forte

                float naturalFishX = baseX;
        float naturalFishY = baseY;

        // === SISTEMA DE MOVIMENTO EM DIREÇÃO AO ANZOL ===
        if (u_gameState >= 2.0 && u_gameState <= 4.0) { // fish_reacting, fish_moving, fish_hooked
          // Interpolar suavemente entre movimento natural e posição do anzol
          float attractionStrength = 0.0;

          if (u_gameState >= 2.0 && u_gameState < 3.0) { // fish_reacting
            attractionStrength = 0.1; // Começar devagar
          } else if (u_gameState >= 3.0 && u_gameState < 4.0) { // fish_moving
            attractionStrength = 0.3; // Aumentar atração
          } else if (u_gameState >= 4.0) { // fish_hooked
            attractionStrength = 0.8; // Muito próximo ao anzol
          }

          // Movimento suave em dire��ão ao anzol
          float targetX = u_hookPosition.x;
          float targetY = u_hookPosition.y;

          naturalFishX = mix(naturalFishX, targetX, attractionStrength);
          naturalFishY = mix(naturalFishY, targetY, attractionStrength);
        }

        // Pequena varia��ão orgânica sutil
        naturalFishX += sin(time * 0.006) * areaW * 0.008;
        naturalFishY += cos(time * 0.004) * areaH * 0.006;

                // === DELIMITAÇÃO DA ÁREA - EXATAMENTE NA LINHA TRACEJADA ===

        // Manter dentro da área exatamente na linha tracejada
        float margin = 0.01; // Margem mínima apenas para evitar pixel bleeding
        naturalFishX = clamp(naturalFishX, areaX + areaW * margin, areaX + areaW * (1.0 - margin));
        naturalFishY = clamp(naturalFishY, areaY + areaH * margin, areaY + areaH * (1.0 - margin));

        // === SISTEMA DE ROTAÇÃO NATURAL ===

                                                                                                // === ORIENTAÇÃO EVO FISH RÁPIDA ===

        // Calcular direção baseada no movimento circular principal
        float velocityX = -sin(mainAngle) * 0.8 * swimSpeed * mainRadius; // Derivada do cos

        // Adicionar variações de trajetória
        velocityX += cos(t * 1.5) * 1.5 * swimSpeed * areaW * 0.15;
        velocityX += -sin(t * 0.6 + 2.0) * 0.6 * swimSpeed * areaW * 0.2;

        // Movimento de busca rápido
        velocityX += cos(t * 2.2) * 2.2 * swimSpeed * areaW * 0.1;

        // Aplicar aceleração
        velocityX *= burstSpeed;

        float fishAngle = 0.0;

                                                                                                                                                                        // === ORIENTAÇÃO DO PEIXE BASEADA NA DIREÇÃO CALCULADA ===
        // Sistema base: controla o flip horizontal (esquerda/direita)
        if (u_fishDirection > 0.0) {
            fishAngle = 3.14159; // Direita (PI para flip correto)
        } else {
            fishAngle = 0.0; // Esquerda (0 para sem flip)
        }

                                // === SISTEMA DE ROTA��ÃO DIAGONAL SUAVE ===
        // Aplica rotação baseada na direção vertical do movimento
                                // u_fishAngle contém o ângulo calculado pelo JavaScript (-30° a +30°)
                float diagonalTilt = u_fishAngle; // 100% do ��ngulo para rotação natural

                // Combinar flip horizontal com rotação diagonal
        if (u_fishDirection > 0.0) {
            // Nadando para direita: PI (flip) + ajuste diagonal (mesmo sinal)
            fishAngle = 3.14159 + diagonalTilt;
        } else {
            // Nadando para esquerda: 0 (sem flip) + ajuste diagonal
            fishAngle = diagonalTilt;
        }

                                        // Usar posição calculada pelo JavaScript com vibração
        float fishX = u_fishTargetPosition.x;
        float fishY = u_fishTargetPosition.y;

        // === PEIXE 2 (VERDE) ===
        float fish2X = u_fish2TargetPosition.x;
        float fish2Y = u_fish2TargetPosition.y;

        // Aplicar vibração no shader se necessário (sincronizada) - APENAS NO PEIXE ATIVO
        if (u_gameState >= 4.0) {
          float vibrationIntensity = 0.003;
          float vibrationX = sin(u_time * 50.0) * vibrationIntensity;
          float vibrationY = cos(u_time * 47.0) * vibrationIntensity;

          // Aplicar vibração apenas no peixe ativo
          if (u_activeFish < 1.5) {
            // Peixe 1 (azul) está ativo
            fishX += vibrationX;
            fishY += vibrationY;
          } else {
            // Peixe 2 (verde) está ativo
            fish2X += vibrationX;
            fish2Y += vibrationY;
          }
        }
        
                                                                // Imagem original
        vec4 originalColor = texture2D(u_backgroundTexture, uv);

        // Renderizar primeiro peixe (azul) apenas se visível
        if (u_fish1Visible > 0.5) {
          originalColor = getColorWithFish(originalColor, uv, fishX, fishY, fishAngle);
        }

        // Cálculo da direção do peixe 2
        float fish2Angle = 0.0;
        if (u_fish2Direction > 0.0) {
            fish2Angle = 3.14159; // Direita (PI para flip correto)
        } else {
            fish2Angle = 0.0; // Esquerda (0 para sem flip)
        }

        // Aplicar rotação diagonal no peixe 2
        float diagonal2Tilt = u_fish2Angle;
        if (u_fish2Direction > 0.0) {
            fish2Angle = 3.14159 + diagonal2Tilt;
        } else {
            fish2Angle = diagonal2Tilt;
        }

        // Renderizar segundo peixe (verde) apenas se visível
        if (u_fish2Visible > 0.5) {
          originalColor = addSecondFish(originalColor, uv, fish2X, fish2Y, fish2Angle);
        }
        
        // Verificar se está na área da água
        bool inWater = isInWaterArea(uv);
        float waterMask = inWater ? 1.0 : 0.0;
        
        if (inWater) {
          // Aplicar efeitos de água apenas dentro da área
          vec2 refraction = calculateRefraction(uv, u_time) * waterMask;
          vec2 distortedUV = uv + refraction;
          
                                                            vec4 backgroundColor = texture2D(u_backgroundTexture, distortedUV);

          // Renderizar peixes na versão com efeitos de água apenas se visíveis
          if (u_fish1Visible > 0.5) {
            backgroundColor = getColorWithFish(backgroundColor, distortedUV, fishX, fishY, fishAngle);
          }
          if (u_fish2Visible > 0.5) {
            backgroundColor = addSecondFish(backgroundColor, distortedUV, fish2X, fish2Y, fish2Angle);
          }
          
          float depth = (sin(uv.x * 3.0) + sin(uv.y * 4.0)) * 0.1 + 0.9;
          backgroundColor.rgb *= depth;
          
          float caustics = calculateCaustics(uv, u_time) * waterMask;
          
          float fresnel = pow(1.0 - abs(dot(normalize(vec3(refraction, 1.0)), vec3(0.0, 0.0, 1.0))), 3.0);
          vec3 surfaceColor = vec3(0.2, 0.4, 0.6) * fresnel * 0.3 * waterMask;
          
          vec3 waterColor = backgroundColor.rgb;
          waterColor += surfaceColor;
          waterColor += vec3(1.0, 1.0, 0.8) * caustics;
          
          waterColor = mix(waterColor, waterColor * vec3(0.9, 0.95, 1.1), 0.3 * waterMask);
          
          float surfaceWave = createWaves(uv, u_time) * 0.1 * waterMask + 0.9;
          waterColor *= surfaceWave;
          
          gl_FragColor = vec4(waterColor, 1.0);
        } else {
          // Fora da água: apenas imagem original
          gl_FragColor = originalColor;
        }
        
                                                                                                                                // Adicionar exclamação com imagem fornecida
        if (u_showExclamation > 0.0 && u_gameState >= 4.0) {
                    // Posi��ão da exclamação (10px para esquerda do centro do peixe ativo, sem vibração)
          float leftOffset = 10.0 / u_resolution.x; // Converter 10px para coordenadas UV

          // Usar posição do peixe ativo (1 = azul, 2 = verde)
          float activeFishX = u_activeFish < 1.5 ? fishX : fish2X;
          float activeFishY = u_activeFish < 1.5 ? fishY : fish2Y;

          vec2 exclamationPos = vec2(activeFishX - leftOffset, activeFishY);

          // Pulsação suave para chamar atenção
          float pulse = 0.98 + 0.02 * sin(u_time * 8.0);

                    // Tamanho da exclamação (82% maior que o original)
          vec2 exclamationSize = vec2(0.015, 0.025) * 1.82 * pulse;

          // Calcular UV da exclamação
          vec2 exclamationUV = (uv - exclamationPos + exclamationSize * 0.5) / exclamationSize;

          // Verificar se está na área da exclamação
          if (exclamationUV.x >= 0.0 && exclamationUV.x <= 1.0 && exclamationUV.y >= 0.0 && exclamationUV.y <= 1.0) {
            // Simular a imagem de exclamação amarela fornecida
            // Criar forma de exclamação baseada na imagem
            vec2 localPos = exclamationUV * 2.0 - 1.0; // Converter para -1 a 1

            // Corpo da exclama��ão (parte comprida) - corrigido para orientação correta
            float bodyWidth = 0.2;
            bool inBody = abs(localPos.x) < bodyWidth && localPos.y > -0.8 && localPos.y < 0.4;

            // Ponto da exclamação (parte pequena embaixo) - corrigido
            float dotSize = 0.2;
            bool inDot = length(localPos - vec2(0.0, 0.7)) < dotSize;

            if (inBody || inDot) {
              // Cor amarela/dourada da exclamação
              vec3 exclamationColor = vec3(1.0, 0.85, 0.0);

              // Adicionar sombra sutil
              vec2 shadowOffset = vec2(0.1, 0.1);
              vec2 shadowPos = localPos - shadowOffset;
              bool inShadowBody = abs(shadowPos.x) < bodyWidth && shadowPos.y > -0.6 && shadowPos.y < 0.8;
              bool inShadowDot = length(shadowPos - vec2(0.0, -1.2)) < dotSize;

              if (inShadowBody || inShadowDot) {
                gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.0, 0.0), 0.3);
              }

              // Aplicar cor da exclamação
              gl_FragColor.rgb = mix(gl_FragColor.rgb, exclamationColor, 1.0);
            }
          }
        }
      }
    `;

    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      vertexShaderSource,
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    this.program = this.createProgram(vertexShader, fragmentShader);
    this.gl.useProgram(this.program);

    // Obtém localizações dos atributos e uniforms (incluindo novos)
    this.attributes.position = this.gl.getAttribLocation(
      this.program,
      "a_position",
    );
    this.attributes.texCoord = this.gl.getAttribLocation(
      this.program,
      "a_texCoord",
    );

    this.uniforms.time = this.gl.getUniformLocation(this.program, "u_time");
    this.uniforms.fishTime = this.gl.getUniformLocation(
      this.program,
      "u_fishTime",
    );
    this.uniforms.waveIntensity = this.gl.getUniformLocation(
      this.program,
      "u_waveIntensity",
    );
    this.uniforms.distortionAmount = this.gl.getUniformLocation(
      this.program,
      "u_distortionAmount",
    );
    this.uniforms.resolution = this.gl.getUniformLocation(
      this.program,
      "u_resolution",
    );
    this.uniforms.backgroundTexture = this.gl.getUniformLocation(
      this.program,
      "u_backgroundTexture",
    );
    this.uniforms.noiseTexture = this.gl.getUniformLocation(
      this.program,
      "u_noiseTexture",
    );
    this.uniforms.fishTexture = this.gl.getUniformLocation(
      this.program,
      "u_fishTexture",
    );
    this.uniforms.gameState = this.gl.getUniformLocation(
      this.program,
      "u_gameState",
    );
    this.uniforms.hookPosition = this.gl.getUniformLocation(
      this.program,
      "u_hookPosition",
    );
    this.uniforms.fishTargetPosition = this.gl.getUniformLocation(
      this.program,
      "u_fishTargetPosition",
    );
    this.uniforms.showExclamation = this.gl.getUniformLocation(
      this.program,
      "u_showExclamation",
    );
    this.uniforms.fishTimeOffset = this.gl.getUniformLocation(
      this.program,
      "u_fishTimeOffset",
    );
    this.uniforms.transitionSmoothing = this.gl.getUniformLocation(
      this.program,
      "u_transitionSmoothing",
    );
    this.uniforms.transitionStartPosition = this.gl.getUniformLocation(
      this.program,
      "u_transitionStartPosition",
    );
    this.uniforms.fishDirection = this.gl.getUniformLocation(
      this.program,
      "u_fishDirection",
    );
    this.uniforms.fishAngle = this.gl.getUniformLocation(
      this.program,
      "u_fishAngle",
    );

    // Novos uniforms para área modular
    this.uniforms.waterArea = this.gl.getUniformLocation(
      this.program,
      "u_waterArea",
    );
    this.uniforms.waterShape = this.gl.getUniformLocation(
      this.program,
      "u_waterShape",
    );

    // Uniforms para o segundo peixe (verde)
    this.uniforms.fish2TargetPosition = this.gl.getUniformLocation(
      this.program,
      "u_fish2TargetPosition",
    );
    this.uniforms.fish2Direction = this.gl.getUniformLocation(
      this.program,
      "u_fish2Direction",
    );
    this.uniforms.fish2Angle = this.gl.getUniformLocation(
      this.program,
      "u_fish2Angle",
    );
    this.uniforms.fish2Texture = this.gl.getUniformLocation(
      this.program,
      "u_fish2Texture",
    );
    this.uniforms.activeFish = this.gl.getUniformLocation(
      this.program,
      "u_activeFish",
    );

    // Uniforms para visibilidade dos peixes
    this.uniforms.fish1Visible = this.gl.getUniformLocation(
      this.program,
      "u_fish1Visible",
    );
    this.uniforms.fish2Visible = this.gl.getUniformLocation(
      this.program,
      "u_fish2Visible",
    );
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Erro ao compilar shader:",
        this.gl.getShaderInfoLog(shader),
      );
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error(
        "Erro ao linkar programa:",
        this.gl.getProgramInfoLog(program),
      );
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  createGeometry() {
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 0.0, 1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,
      0.0, 1.0,
    ]);

    const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      indices,
      this.gl.STATIC_DRAW,
    );
  }

  createTextures() {
    this.createBackgroundTexture();
    this.createNoiseTexture();
    this.createFishTexture();
    this.createFish2Texture(); // Textura do peixe verde
  }

  createBackgroundTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(1, "#764ba2");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    this.backgroundTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );
  }

  createNoiseTexture() {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const noise = Math.random() * 255;
      data[i * 4] = noise;
      data[i * 4 + 1] = noise;
      data[i * 4 + 2] = noise;
      data[i * 4 + 3] = 255;
    }

    this.noiseTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      size,
      size,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      data,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );
  }

  createFishTexture() {
    this.fishTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fishTexture);

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#4A90E2";
    ctx.beginPath();
    ctx.ellipse(32, 32, 25, 15, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(7, 32);
    ctx.lineTo(15, 20);
    ctx.lineTo(15, 44);
    ctx.closePath();
    ctx.fill();

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );

    // Carrega a imagem real do peixe
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.fishTexture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        img,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR,
      );
    };
    img.src =
      "https://cdn.builder.io/api/v1/image/assets%2Fc79b00ce148640919b4d22fcf2a41b59%2F2856af704b4e406cb206025a802b3bdc?format=webp&width=800";
  }

  createFish2Texture() {
    this.fish2Texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fish2Texture);

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Placeholder verde até carregar a imagem real
    ctx.fillStyle = "#4ABAD2";
    ctx.beginPath();
    ctx.ellipse(32, 32, 25, 15, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(7, 32);
    ctx.lineTo(15, 20);
    ctx.lineTo(15, 44);
    ctx.closePath();
    ctx.fill();

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );

    // Carrega a imagem real do peixe verde
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.fish2Texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        img,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR,
      );
    };
    img.src =
      "https://cdn.builder.io/api/v1/image/assets%2Fc79b00ce148640919b4d22fcf2a41b59%2Fe5f89db4d2e242d9972a7d48951cd4a7?format=webp&width=800";
  }

  // Atualizar área da água
  updateWaterArea(waterArea) {
    this.waterArea = waterArea;
  }

  // Métodos do jogo de pesca (mantidos originais mas simplificados)
  startFishingGame(hookX, hookY) {
    console.log("Starting fishing game at", hookX, hookY);

    // Apenas peixes visíveis podem ser ativos
    const availableFish = [];
    if (this.fish1Visible) availableFish.push(1);
    if (this.fish2Visible) availableFish.push(2);

    if (availableFish.length === 0) {
      console.log("❌ Nenhum peixe disponível para pescar!");
      return;
    }

    // Seleção aleatória entre peixes disponíveis
    this.activeFish =
      availableFish[Math.floor(Math.random() * availableFish.length)];
    console.log(
      `🎯 Peixe ativo: ${this.activeFish === 1 ? "Azul" : "Verde"} (disponíveis: ${availableFish.length})`,
    );

    this.gameState = "hook_cast";
    this.hookPosition = { x: hookX, y: hookY };
    this.canClickExclamation = false;
    this.fishReactionDelay = 4000 + Math.random() * 8000;
    this.fishReactionStartTime = Date.now();
  }

  // Verificar se o anzol está dentro da área de água
  isHookInWater() {
    if (!this.waterArea) {
      return false; // Se não há área definida, assumir que não está na água
    }

    const hookX = this.hookPosition.x;
    const hookY = this.hookPosition.y;

    // Verificar se está dentro da área de água definida
    const { x, y, width, height, shape } = this.waterArea;

    switch (shape) {
      case "rectangle":
        return (
          hookX >= x && hookX <= x + width && hookY >= y && hookY <= y + height
        );

      case "circle": {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) / 2;
        const distance = Math.sqrt(
          (hookX - centerX) ** 2 + (hookY - centerY) ** 2,
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
          (hookX - tx2) * (ty3 - ty2) - (tx3 - tx2) * (hookY - ty2),
        );
        const area2 = Math.abs(
          (tx1 - hookX) * (hookY - ty1) - (hookX - tx1) * (ty1 - hookY),
        );
        const area3 = Math.abs(
          (tx2 - tx1) * (hookY - ty1) - (hookX - tx1) * (ty2 - ty1),
        );

        return Math.abs(area - (area1 + area2 + area3)) < 0.001;
      }

      default:
        return false;
    }
  }

  // Método para movimento orgânico - evitar bordas naturalmente
  avoidBorders() {
    if (!this.waterArea) {
      return { x: 0, y: 0 }; // Retorna força nula se waterArea não estiver definida
    }

    const detectionMargin = 0.08; // Detectar bordas com antecedência
    const centerX = this.waterArea.x + this.waterArea.width / 2;
    const centerY = this.waterArea.y + this.waterArea.height / 2;

    const steeringForce = { x: 0, y: 0 };
    let shouldChangeDirection = false;

    // Verificar proximidade das bordas e criar força de direcionamento natural
    const distanceToLeft = this.fishCurrentPosition.x - this.waterArea.x;
    const distanceToRight =
      this.waterArea.x + this.waterArea.width - this.fishCurrentPosition.x;
    const distanceToTop = this.fishCurrentPosition.y - this.waterArea.y;
    const distanceToBottom =
      this.waterArea.y + this.waterArea.height - this.fishCurrentPosition.y;

    // Se está muito perto das bordas, direcionar para o centro
    if (distanceToLeft < detectionMargin) {
      const intensity = (detectionMargin - distanceToLeft) / detectionMargin;
      steeringForce.x += intensity * 2; // Força para direita
      shouldChangeDirection = true;
    }
    if (distanceToRight < detectionMargin) {
      const intensity = (detectionMargin - distanceToRight) / detectionMargin;
      steeringForce.x -= intensity * 2; // Força para esquerda
      shouldChangeDirection = true;
    }
    if (distanceToTop < detectionMargin) {
      const intensity = (detectionMargin - distanceToTop) / detectionMargin;
      steeringForce.y += intensity * 2; // Força para baixo
      shouldChangeDirection = true;
    }
    if (distanceToBottom < detectionMargin) {
      const intensity = (detectionMargin - distanceToBottom) / detectionMargin;
      steeringForce.y -= intensity * 2; // Força para cima
      shouldChangeDirection = true;
    }

    // Se está perto de uma borda, forçar mudança de direção imediata
    if (shouldChangeDirection) {
      // Escolher nova direção que aponte para longe das bordas próximas
      let newAngle;

      // Calcular direção ideal: para o centro, mas com variação
      const directionToCenter = Math.atan2(
        centerY - this.fishCurrentPosition.y,
        centerX - this.fishCurrentPosition.x,
      );

      // Adicionar variação aleatória para movimento natural
      const variation = (Math.random() - 0.5) * Math.PI * 0.8; // ±72 graus
      newAngle = directionToCenter + variation;

      // Atualizar direção desejada imediatamente
      this.fishDesiredDirection.x = Math.cos(newAngle);
      this.fishDesiredDirection.y = Math.sin(newAngle) * 0.6;

      // Resetar timer para evitar mudanças muito frequentes
      this.directionChangeTime = Date.now();
      this.directionChangeCooldown = 2000 + Math.random() * 3000; // 2-5 segundos após evitação
    }

    return steeringForce;
  }

  // Método para mudança gradual de direção
  updateDesiredDirection() {
    const currentTime = Date.now();

    // Verificar se é hora de mudar direção
    if (currentTime - this.directionChangeTime > this.directionChangeCooldown) {
      // Gerar nova direç��o favorecendo movimento horizontal
      let angle;

      if (Math.random() < 0.7) {
        // 70% chance de movimento mais horizontal (-45° a 45° ou 135° a 225°)
        if (Math.random() < 0.5) {
          angle = (Math.random() - 0.5) * Math.PI * 0.5; // -45° a 45°
        } else {
          angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5; // 135° a 225°
        }
      } else {
        // 30% chance de movimento em qualquer direção (para variedade)
        angle = Math.random() * Math.PI * 2;
      }

      this.fishDesiredDirection.x = Math.cos(angle);
      this.fishDesiredDirection.y = Math.sin(angle) * 0.6; // Reduzir movimento vertical

      // Resetar timer com novo intervalo aleatório mais lento
      this.directionChangeTime = currentTime;
      this.directionChangeCooldown = 3000 + Math.random() * 4000; // 3-7 segundos
    }
  }

  // Método para atualizar posição do peixe suavemente
  updateFishPosition() {
    // Se o peixe ativo não é o peixe 1, apenas movimento livre
    if (this.activeFish !== 1) {
      this.updateFishFreeMovement();
      this.updateFishPositionCommon();
      return;
    }

    if (this.gameState === "idle" || this.gameState === "hook_cast") {
      this.updateFishFreeMovement();
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      // === MOVIMENTO EM DIREÇÃO AO ANZOL ===
      const dx = this.hookPosition.x - this.fishCurrentPosition.x;
      const dy = this.hookPosition.y - this.fishCurrentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const moveSpeed = 0.0003; // Velocidade mais lenta e curiosa
        this.fishVelocity.x = (dx / distance) * moveSpeed;
        this.fishVelocity.y = (dy / distance) * moveSpeed;
      }
    } else if (this.gameState === "fish_hooked") {
      // === PARADO NO ANZOL ===
      // A BOCA deve ficar no anzol, não o centro do peixe
      this.fishVelocity.x = 0;
      this.fishVelocity.y = 0;

      // Calcular posição do centro do peixe para que a boca fique EXATAMENTE no anzol
      // Usar mesma lógica do drawFishMouthOverlay para consistência
      const fishSizePixelX = 0.08; // Tamanho do peixe no shader

      // Lógica idêntica ao drawFishMouthOverlay
      let mouthOffsetX;
      if (this.fishDirection > 0) {
        mouthOffsetX = fishSizePixelX / 2 - 10 / window.innerWidth; // Converter 10px para UV
      } else {
        mouthOffsetX = -(fishSizePixelX / 2) + 10 / window.innerWidth; // Converter 10px para UV
      }

      // Adicionar offset adicional do drawFishMouthOverlay
      const additionalOffsetX =
        (this.fishDirection > 0 ? -7 : 7) / window.innerWidth; // Converter -7px/+7px para UV

      // Posicionar centro do peixe para que boca fique EXATAMENTE no anzol
      let baseX = this.hookPosition.x - mouthOffsetX - additionalOffsetX;
      let baseY = this.hookPosition.y - 2 / window.innerHeight; // Converter 2px para UV (offset Y da boca)

      // Adicionar vibração se estiver vibrando
      if (this.isVibrating) {
        const vibrationTime = Date.now() * 0.05;
        const vibrationIntensity = 0.003;
        baseX += Math.sin(vibrationTime) * vibrationIntensity;
        baseY += Math.cos(vibrationTime * 0.94) * vibrationIntensity;
      }

      this.fishCurrentPosition.x = baseX;
      this.fishCurrentPosition.y = baseY;
    }

    this.updateFishPositionCommon();
  }

  // Método comum para movimento livre do peixe 1
  updateFishFreeMovement() {
    // === MOVIMENTO ORGÂNICO LIVRE ===

    // Atualizar direção desejada
    this.updateDesiredDirection();

    // Obter força de evitar bordas
    const avoidanceForce = this.avoidBorders();

    // Combinar direção desejada com evitação de bordas
    const targetDirection = {
      x: this.fishDesiredDirection.x + avoidanceForce.x,
      y: this.fishDesiredDirection.y + avoidanceForce.y,
    };

    // Normalizar direção
    const magnitude = Math.sqrt(
      targetDirection.x * targetDirection.x +
        targetDirection.y * targetDirection.y,
    );
    if (magnitude > 0) {
      targetDirection.x /= magnitude;
      targetDirection.y /= magnitude;
    }

    // Aplicar força de direção suavemente à velocidade
    const acceleration = 0.00002; // Aceleração mais suave e lenta
    this.fishVelocity.x += targetDirection.x * acceleration;
    this.fishVelocity.y += targetDirection.y * acceleration;

    // Variar velocidade naturalmente de forma mais suave
    const speedVariation = 0.7 + 0.3 * Math.sin(Date.now() * 0.001);
    const maxSpeed = this.fishSpeed * speedVariation;

    // Limitar velocidade máxima
    const currentSpeed = Math.sqrt(
      this.fishVelocity.x * this.fishVelocity.x +
        this.fishVelocity.y * this.fishVelocity.y,
    );
    if (currentSpeed > maxSpeed) {
      this.fishVelocity.x = (this.fishVelocity.x / currentSpeed) * maxSpeed;
      this.fishVelocity.y = (this.fishVelocity.y / currentSpeed) * maxSpeed;
    }

    // Aplicar damping natural (mais suave)
    this.fishVelocity.x *= 0.985;
    this.fishVelocity.y *= 0.985;
  }

  // Método comum para finalizar atualização de posição do peixe 1
  updateFishPositionCommon() {
    // Atualizar posição
    if (this.gameState !== "fish_hooked" || this.activeFish !== 1) {
      this.fishCurrentPosition.x += this.fishVelocity.x;
      this.fishCurrentPosition.y += this.fishVelocity.y;

      // Forçar peixe a ficar exatamente dentro da linha tracejada
      if (this.waterArea) {
        const clampMargin = 0.01; // Margem mínima apenas para evitar pixel bleeding
        this.fishCurrentPosition.x = Math.max(
          this.waterArea.x + clampMargin,
          Math.min(
            this.waterArea.x + this.waterArea.width - clampMargin,
            this.fishCurrentPosition.x,
          ),
        );
        this.fishCurrentPosition.y = Math.max(
          this.waterArea.y + clampMargin,
          Math.min(
            this.waterArea.y + this.waterArea.height - clampMargin,
            this.fishCurrentPosition.y,
          ),
        );
      }
    }

    // Calcular direção do peixe baseada na velocidade
    // Atualizar dire��ão e ângulo baseados na velocidade
    const velocityMagnitude = Math.sqrt(
      this.fishVelocity.x * this.fishVelocity.x +
        this.fishVelocity.y * this.fishVelocity.y,
    );

    if (velocityMagnitude > 0.0001) {
      // Manter sistema original para direção horizontal
      this.fishDirection = this.fishVelocity.x > 0 ? 1 : -1;

      // NOVA IMPLEMENTAÇÃO: Rotação diagonal suave baseada na direção do movimento
      const horizontalComponent = this.fishVelocity.x;
      const verticalComponent = this.fishVelocity.y;

      // Calcular rotação baseada na velocidade vertical
      if (Math.abs(verticalComponent) > 0.0002) {
        // Cálculo SIMPLES: apenas velocidade vertical importa para inclinação
        // Velocidade Y positiva = nadando para baixo = ângulo positivo
        // Velocidade Y negativa = nadando para cima = ângulo negativo
        const maxTiltAngle = Math.PI / 6; // 30 graus máximo
        const velocityScale = 1000; // Escala para converter velocidade em ângulo

        let targetAngle = verticalComponent * velocityScale;

        // Limitar o ângulo
        targetAngle = Math.max(
          -maxTiltAngle,
          Math.min(maxTiltAngle, targetAngle),
        );

        // Aplicar suavizaç��o simples e responsíva
        if (this.fishAngle === undefined || this.fishAngle === 0) {
          this.fishAngle = targetAngle * 0.2; // Começar com 20% do ângulo
        } else {
          // Interpolação linear direta
          const lerpSpeed = 0.08; // Suavização leve
          this.fishAngle =
            this.fishAngle + (targetAngle - this.fishAngle) * lerpSpeed;
        }
      } else {
        // Quando não há movimento, gradualmente retornar para posição horizontal
        if (this.fishAngle !== undefined) {
          this.fishAngle *= 0.8; // Retorno mais rápido para 0
          if (Math.abs(this.fishAngle) < 0.01) {
            this.fishAngle = 0; // Parada mais rápida
          }
        } else {
          this.fishAngle = 0;
        }
      }
    } else if (this.fishAngle === undefined) {
      this.fishAngle = 0;
    }

    // Log de debug para monitoramento
    if (Math.random() < 0.008) {
      // 0.8% para debug moderado
      const angleDegrees = this.fishAngle
        ? (this.fishAngle * 180) / Math.PI
        : 0;
      const verticalVel = this.fishVelocity.y.toFixed(6);
      const horizontalDir = this.fishDirection > 0 ? "DIREITA" : "ESQUERDA";
      const verticalDir =
        this.fishVelocity.y > 0.0002
          ? "BAIXO"
          : this.fishVelocity.y < -0.0002
            ? "CIMA"
            : "PARADO";
      const expectedTilt =
        this.fishVelocity.y > 0
          ? "para baixo"
          : this.fishVelocity.y < 0
            ? "para cima"
            : "horizontal";

      console.log(
        `🐟 DEBUG PEIXE 1 - Lado: ${horizontalDir}, Movimento: ${verticalDir}, Inclinação esperada: ${expectedTilt}, Ângulo: ${angleDegrees.toFixed(1)}°`,
      );
    }
  }

  // Método para atualizar posição do segundo peixe (verde)
  updateFish2Position() {
    // Se o peixe ativo não é o peixe 2, apenas movimento livre
    if (this.activeFish !== 2) {
      this.updateFish2FreeMovement();
      this.updateFish2PositionCommon();
      return;
    }

    if (this.gameState === "idle" || this.gameState === "hook_cast") {
      this.updateFish2FreeMovement();
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      // === MOVIMENTO EM DIREÇÃO AO ANZOL ===
      const dx = this.hookPosition.x - this.fish2CurrentPosition.x;
      const dy = this.hookPosition.y - this.fish2CurrentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const moveSpeed = 0.0003; // Velocidade mais lenta e curiosa
        this.fish2Velocity.x = (dx / distance) * moveSpeed;
        this.fish2Velocity.y = (dy / distance) * moveSpeed;
      }
    } else if (this.gameState === "fish_hooked") {
      // === PARADO NO ANZOL ===
      // A BOCA deve ficar no anzol, não o centro do peixe
      this.fish2Velocity.x = 0;
      this.fish2Velocity.y = 0;

      // Calcular posição do centro do peixe para que a boca fique EXATAMENTE no anzol
      const fishSizePixelX = 0.08; // Tamanho do peixe no shader

      // Lógica idêntica ao drawFishMouthOverlay
      let mouthOffsetX;
      if (this.fish2Direction > 0) {
        mouthOffsetX = fishSizePixelX / 2 - 10 / window.innerWidth; // Converter 10px para UV
      } else {
        mouthOffsetX = -(fishSizePixelX / 2) + 10 / window.innerWidth; // Converter 10px para UV
      }

      // Adicionar offset adicional
      const additionalOffsetX =
        (this.fish2Direction > 0 ? -7 : 7) / window.innerWidth; // Converter -7px/+7px para UV

      // Posicionar centro do peixe para que boca fique EXATAMENTE no anzol
      let baseX = this.hookPosition.x - mouthOffsetX - additionalOffsetX;
      let baseY = this.hookPosition.y - 2 / window.innerHeight; // Converter 2px para UV (offset Y da boca)

      // Adicionar vibração se estiver vibrando
      if (this.isVibrating) {
        const vibrationTime = Date.now() * 0.05;
        const vibrationIntensity = 0.003;
        baseX += Math.sin(vibrationTime) * vibrationIntensity;
        baseY += Math.cos(vibrationTime * 0.94) * vibrationIntensity;
      }

      this.fish2CurrentPosition.x = baseX;
      this.fish2CurrentPosition.y = baseY;
    }

    this.updateFish2PositionCommon();
  }

  // Método comum para movimento livre do peixe 2
  updateFish2FreeMovement() {
    // Movimento orgânico independente para o peixe 2
    const currentTime = Date.now();

    // Atualizar direção desejada do peixe 2
    if (
      currentTime - this.fish2DirectionChangeTime >
      this.fish2DirectionChangeCooldown
    ) {
      // Gerar nova direção
      const angle = Math.random() * Math.PI * 2;
      this.fish2DesiredDirection.x = Math.cos(angle);
      this.fish2DesiredDirection.y = Math.sin(angle) * 0.6; // Reduzir movimento vertical

      this.fish2DirectionChangeTime = currentTime;
      this.fish2DirectionChangeCooldown = 3500 + Math.random() * 3500; // 3.5-7 segundos
    }

    // Aplicar força de direção suavemente à velocidade
    const acceleration = 0.00002;
    this.fish2Velocity.x += this.fish2DesiredDirection.x * acceleration;
    this.fish2Velocity.y += this.fish2DesiredDirection.y * acceleration;

    // Variar velocidade naturalmente
    const speedVariation = 0.7 + 0.3 * Math.sin(currentTime * 0.0008);
    const maxSpeed = this.fish2Speed * speedVariation;

    // Limitar velocidade máxima
    const currentSpeed = Math.sqrt(
      this.fish2Velocity.x * this.fish2Velocity.x +
        this.fish2Velocity.y * this.fish2Velocity.y,
    );
    if (currentSpeed > maxSpeed) {
      this.fish2Velocity.x = (this.fish2Velocity.x / currentSpeed) * maxSpeed;
      this.fish2Velocity.y = (this.fish2Velocity.y / currentSpeed) * maxSpeed;
    }

    // Aplicar damping natural
    this.fish2Velocity.x *= 0.985;
    this.fish2Velocity.y *= 0.985;
  }

  // Método comum para finalizar atualização de posição do peixe 2
  updateFish2PositionCommon() {
    // Atualizar posição
    if (this.gameState !== "fish_hooked" || this.activeFish !== 2) {
      this.fish2CurrentPosition.x += this.fish2Velocity.x;
      this.fish2CurrentPosition.y += this.fish2Velocity.y;

      // Manter dentro da área da água
      if (this.waterArea) {
        const clampMargin = 0.01;
        this.fish2CurrentPosition.x = Math.max(
          this.waterArea.x + clampMargin,
          Math.min(
            this.waterArea.x + this.waterArea.width - clampMargin,
            this.fish2CurrentPosition.x,
          ),
        );
        this.fish2CurrentPosition.y = Math.max(
          this.waterArea.y + clampMargin,
          Math.min(
            this.waterArea.y + this.waterArea.height - clampMargin,
            this.fish2CurrentPosition.y,
          ),
        );
      }
    }

    // Calcular direção e ângulo do peixe 2
    const velocityMagnitude2 = Math.sqrt(
      this.fish2Velocity.x * this.fish2Velocity.x +
        this.fish2Velocity.y * this.fish2Velocity.y,
    );

    if (velocityMagnitude2 > 0.0001) {
      // Direção horizontal
      this.fish2Direction = this.fish2Velocity.x > 0 ? 1 : -1;

      // Rotação baseada na velocidade vertical
      const verticalVelocity2 = this.fish2Velocity.y;
      if (Math.abs(verticalVelocity2) > 0.0002) {
        const maxTiltAngle = Math.PI / 6; // 30 graus m��ximo
        const velocityScale = 1000;
        let targetAngle = verticalVelocity2 * velocityScale;
        targetAngle = Math.max(
          -maxTiltAngle,
          Math.min(maxTiltAngle, targetAngle),
        );

        if (this.fish2Angle === undefined || this.fish2Angle === 0) {
          this.fish2Angle = targetAngle * 0.2;
        } else {
          const lerpSpeed = 0.08;
          this.fish2Angle =
            this.fish2Angle + (targetAngle - this.fish2Angle) * lerpSpeed;
        }
      } else {
        if (this.fish2Angle !== undefined && Math.abs(this.fish2Angle) > 0.01) {
          this.fish2Angle *= 0.8;
        } else {
          this.fish2Angle = 0;
        }
      }
    } else if (this.fish2Angle === undefined) {
      this.fish2Angle = 0;
    }

    // Log de debug para monitoramento
    if (Math.random() < 0.008) {
      // 0.8% para debug moderado
      const angleDegrees = this.fish2Angle
        ? (this.fish2Angle * 180) / Math.PI
        : 0;
      const verticalVel = this.fish2Velocity.y.toFixed(6);
      const horizontalDir = this.fish2Direction > 0 ? "DIREITA" : "ESQUERDA";
      const verticalDir =
        this.fish2Velocity.y > 0.0002
          ? "BAIXO"
          : this.fish2Velocity.y < -0.0002
            ? "CIMA"
            : "PARADO";
      const expectedTilt =
        this.fish2Velocity.y > 0
          ? "para baixo"
          : this.fish2Velocity.y < 0
            ? "para cima"
            : "horizontal";

      console.log(
        `🐟 DEBUG PEIXE 2 - Lado: ${horizontalDir}, Movimento: ${verticalDir}, Inclinação esperada: ${expectedTilt}, Ângulo: ${angleDegrees.toFixed(1)}°`,
      );
    }
  }

  // Método para lidar com clique na exclamação
  handleExclamationClick() {
    console.log(
      "🎯 handleExclamationClick called - gameState:",
      this.gameState,
      "canClick:",
      this.canClickExclamation,
      "callback exists:",
      !!this.onGameStart,
      "backup exists:",
      !!this.onGameStartBackup,
    );

    // Verificar e restaurar callback se necessário
    if (!this.onGameStart && this.onGameStartBackup) {
      console.log("🔄 Auto-restoring callback in handleExclamationClick");
      this.onGameStart = this.onGameStartBackup;
    }

    if (this.gameState === "fish_hooked" && this.canClickExclamation) {
      console.log("Player clicked exclamation! Showing Fisgado text.");
      this.canClickExclamation = false;
      this.exclamationTime = 0;

      // Mostrar texto "Fisgado!" por 0.6 segundos
      this.showFisgadoText = true;
      this.fisgadoTextStartTime = Date.now();

      // CORRIGIDO: Chamar onGameStart imediatamente para evitar perda de callback
      console.log(
        "🎮 About to call onGameStart - callback exists:",
        !!this.onGameStart,
      );

      // Salvar referência do callback antes de qualquer coisa
      const savedCallback = this.onGameStart;

      if (savedCallback) {
        console.log("🎮 Calling onGameStart callback immediately!");

        // Após 600ms, esconder texto e abrir minigame
        const fisgadoTimer = setTimeout(() => {
          this.showFisgadoText = false;
          console.log("🎮 Opening minigame now...");
          savedCallback(); // Usar callback salvo
        }, 600);

        if (!this.activeTimers) this.activeTimers = [];
        this.activeTimers.push(fisgadoTimer);
      } else {
        console.log("❌ onGameStart callback is null! Attempting recovery...");

        // Tentar restaurar do backup
        if (this.onGameStartBackup) {
          console.log("🔄 Restoring callback from backup");
          this.onGameStart = this.onGameStartBackup;

          const fisgadoTimer = setTimeout(() => {
            this.showFisgadoText = false;
            console.log("��� Opening minigame with restored callback...");
            this.onGameStart();
          }, 600);

          if (!this.activeTimers) this.activeTimers = [];
          this.activeTimers.push(fisgadoTimer);
        } else {
          console.log(
            "❌ No backup callback available! Minigame cannot start.",
          );
        }
      }

      return true;
    }
    return false;
  }

  // Método para capturar peixe (esconder e agendar respawn)
  catchActiveFish() {
    const caughtFishName = this.activeFish === 1 ? "Azul" : "Verde";
    console.log(`🎣 Capturando peixe ${caughtFishName}...`);

    // Obter dados antes de esconder o peixe
    const fishData = {
      species: caughtFishName === "Azul" ? "Peixinho Azul" : "Peixinho Verde",
      activeFish: this.activeFish,
      position: {
        x:
          this.activeFish === 1
            ? this.fishCurrentPosition.x
            : this.fish2CurrentPosition.x,
        y:
          this.activeFish === 1
            ? this.fishCurrentPosition.y
            : this.fish2CurrentPosition.y,
      },
    };

    if (this.activeFish === 1) {
      // Esconder peixe azul
      this.fish1Visible = false;
      this.fish1RespawnTime = Date.now() + 15000; // 15 segundos
      console.log("🐟 Peixe Azul capturado! Respawn em 15s");
    } else {
      // Esconder peixe verde
      this.fish2Visible = false;
      this.fish2RespawnTime = Date.now() + 15000; // 15 segundos
      console.log("🐟 Peixe Verde capturado! Respawn em 15s");
    }

    // Resetar o jogo após captura
    this.resetFishingGame();

    // Retornar dados do peixe capturado
    return fishData;
  }

  // M��todo para verificar e processar respawns
  updateRespawns() {
    const currentTime = Date.now();

    // Verificar respawn do peixe azul
    if (
      !this.fish1Visible &&
      this.fish1RespawnTime > 0 &&
      currentTime >= this.fish1RespawnTime
    ) {
      this.fish1Visible = true;
      this.fish1RespawnTime = 0;
      console.log("🔄 Peixe Azul respawnou!");
    }

    // Verificar respawn do peixe verde
    if (
      !this.fish2Visible &&
      this.fish2RespawnTime > 0 &&
      currentTime >= this.fish2RespawnTime
    ) {
      this.fish2Visible = true;
      this.fish2RespawnTime = 0;
      console.log("🔄 Peixe Verde respawnou!");
    }
  }

  updateFishingGame() {
    // Verificar e processar respawns
    this.updateRespawns();

    // Atualizar posição do peixe 1 (azul) a cada frame
    this.updateFishPosition();

    // Atualizar posição do peixe 2 (verde) a cada frame
    this.updateFish2Position();

    if (this.gameState === "hook_cast") {
      const elapsedTime = Date.now() - this.fishReactionStartTime;
      if (elapsedTime >= this.fishReactionDelay) {
        // VERIFICAÇÃO: Anzol deve estar na água para peixe reagir
        if (!this.isHookInWater()) {
          console.log("🎣 Hook is not in water - fish will not react");
          this.resetFishingGame(); // Reset se anzol não estiver na água
          return;
        }

        // Capturar posição atual e começar reação
        this.gameState = "fish_reacting";
        const activeFishName = this.activeFish === 1 ? "AZUL" : "VERDE";
        const activeFishPosition =
          this.activeFish === 1
            ? this.fishCurrentPosition
            : this.fish2CurrentPosition;
        console.log(
          `🎣 ${activeFishName} fish reacting! Hook at (${this.hookPosition.x.toFixed(3)}, ${this.hookPosition.y.toFixed(3)}) - Fish at (${activeFishPosition.x.toFixed(3)}, ${activeFishPosition.y.toFixed(3)}) - Hook in water: ${this.isHookInWater()}`,
        );

        // Começar movimento após breve pausa
        const reactionTimer = setTimeout(() => {
          if (this.gameState === "fish_reacting") {
            this.gameState = "fish_moving";
          }
        }, 500);
        if (!this.activeTimers) this.activeTimers = [];
        this.activeTimers.push(reactionTimer);
      }
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      // VERIFICAÇÃO CONTÍNUA: Se anzol saiu da ��gua durante movimento, resetar
      if (!this.isHookInWater()) {
        console.log(
          "🎣 Hook removed from water during fish movement - resetting",
        );
        this.resetFishingGame();
        return;
      }

      // Verificar distância do peixe ativo ao anzol
      const activeFishPosition =
        this.activeFish === 1
          ? this.fishCurrentPosition
          : this.fish2CurrentPosition;
      const distance = Math.sqrt(
        Math.pow(activeFishPosition.x - this.hookPosition.x, 2) +
          Math.pow(activeFishPosition.y - this.hookPosition.y, 2),
      );

      if (distance < 0.03) {
        // VERIFICAÇÃO: Anzol deve estar na água para peixe ser fisgado
        if (!this.isHookInWater()) {
          console.log(
            "🎣 Fish reached hook position but hook is not in water - resetting",
          );
          this.resetFishingGame();
          return;
        }

        // Chegou próximo ao anzol
        this.gameState = "fish_hooked";
        this.exclamationTime = 1000;
        this.exclamationStartTime = Date.now();
        this.canClickExclamation = true;
        this.isVibrating = true;
        const activeFishName = this.activeFish === 1 ? "AZUL" : "VERDE";
        console.log(
          `🎣 ${activeFishName} fish hooked! Hook at (${this.hookPosition.x.toFixed(3)}, ${this.hookPosition.y.toFixed(3)}) - Hook in water: ${this.isHookInWater()} - Starting exclamation timer.`,
        );

        // Timer automático será gerenciado no updateFishingGame()
      }
    } else if (this.gameState === "fish_hooked") {
      // VERIFICAÇÃO CONTÍNUA: Se anzol saiu da água durante fish_hooked, resetar imediatamente
      if (!this.isHookInWater()) {
        console.log(
          "🎣 Hook removed from water while fish hooked - resetting immediately",
        );
        this.isVibrating = false;
        this.resetFishingGame();
        return;
      }

      // Usar tempo real em vez de contador de frames
      const elapsedTime = Date.now() - this.exclamationStartTime;

      if (elapsedTime < 1000) {
        // Ainda dentro do período de 1 segundo
        this.exclamationTime = 1000 - elapsedTime;
      } else {
        // Passou 1 segundo - peixe vai embora automaticamente
        this.exclamationTime = 0;
        this.canClickExclamation = false;

        if (this.gameState === "fish_hooked") {
          console.log("Timer expired - fish swims away automatically");
          this.isVibrating = false;
          this.resetFishingGame();
        }
      }
    }
  }

  resetFishingGame() {
    // IMPORTANTE: NÃO limpar timers se o minigame está sendo ativado
    console.log(
      "🔄 resetFishingGame called - showFisgadoText:",
      this.showFisgadoText,
      "onGameStart:",
      !!this.onGameStart,
      "backup:",
      !!this.onGameStartBackup,
    );

    if (this.showFisgadoText) {
      console.log("⚠�� Skipping timer cleanup - minigame is starting!");
      // Não limpar timers quando "Fisgado!" está sendo mostrado
    } else {
      // Limpar todos os timers ativos para evitar comportamentos persistentes
      if (this.activeTimers) {
        this.activeTimers.forEach((timer) => clearTimeout(timer));
        this.activeTimers = [];
        console.log("🧹 Cleared all active timers");
      } else {
        // Inicializar se não existe
        this.activeTimers = [];
        console.log("🧹 Initialized activeTimers array");
      }
    }

    if (
      this.gameState === "fish_moving" ||
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_hooked"
    ) {
      this.transitionStartPosition = {
        x: this.fishTargetPosition.x,
        y: this.fishTargetPosition.y,
      };
      this.transitionBackToNaturalTime = Date.now();
    }

    // Verificar se o anzol ainda está na água para permitir novo interesse
    const hookInWater = this.isHookInWater();
    console.log(
      `��� RESET DEBUG - Hook position: (${this.hookPosition.x.toFixed(3)}, ${this.hookPosition.y.toFixed(3)}) - isHookInWater: ${hookInWater}`,
    );

    // CORREÇÃO: Só reagir novamente se o anzol foi genuinamente lançado pela vara
    // e não apenas está na posi��ão de água por acaso
    const wasProperlyReset =
      this.hookPosition.x === 0.5 && this.hookPosition.y === 0.5;

    if (hookInWater && !wasProperlyReset) {
      console.log(
        "🎣 Hook still in water after genuine cast - will schedule new reaction",
      );
      this.gameState = "hook_cast";
      this.fishReactionDelay = 3000 + Math.random() * 6000; // 3-9 segundos para nova tentativa
      this.fishReactionStartTime = Date.now();
      console.log(
        `🎣 Fish will try again in ${(this.fishReactionDelay / 1000).toFixed(1)}s since hook is still in water`,
      );
    } else {
      // Se não, voltar ao estado idle e garantir reset completo
      console.log("���� Complete reset - hook removed from water");
      this.gameState = "idle";
      this.hookPosition = { x: 0.5, y: 0.5 }; // Garantir reset da posição
      this.fishReactionStartTime = 0;
      this.fishReactionDelay = 0;
    }

    this.exclamationTime = 0;
    this.isVibrating = false;
    this.showFisgadoText = false;
    this.canClickExclamation = false;

    // IMPORTANTE: Preservar backup do callback
    if (this.onGameStartBackup && !this.onGameStart) {
      console.log("🔄 Restoring callback from backup after reset");
      this.onGameStart = this.onGameStartBackup;
    }

    console.log(
      "⚠️ resetFishingGame completed - callback state:",
      !!this.onGameStart,
      "backup:",
      !!this.onGameStartBackup,
    );
  }

  updateBackgroundFromImage(image) {
    if (!this.gl || !this.backgroundTexture) {
      console.warn("WebGL context or background texture not available");
      return;
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      image,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );
  }

  // M��todo para desenhar apenas texto "Fisgado!" sem círculo da boca
  drawFisgadoTextOnly() {
    const overlayCanvas = document.getElementById("fishMouthOverlay");
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    // Ajustar tamanho do overlay
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;

    // Limpar canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Usar a MESMA posição do peixe ativo
    const activeFishPosition =
      this.activeFish === 1
        ? this.fishCurrentPosition
        : this.fish2CurrentPosition;
    const fishUvX = activeFishPosition.x;
    const fishUvY = activeFishPosition.y;

    // Converter para pixels
    const fishPixelX = fishUvX * overlayCanvas.width;
    const fishPixelY = fishUvY * overlayCanvas.height;

    // Desenhar apenas texto "Fisgado!"
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 24px Arial";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    const text = "Fisgado!";
    const textMetrics = ctx.measureText(text);
    const textX = fishPixelX - textMetrics.width / 2;
    const textY = fishPixelY - 60;

    ctx.strokeText(text, textX, textY);
    ctx.fillText(text, textX, textY);
  }

  // Método para desenhar overlay da boca do peixe (APENAS ADMIN)
  drawFishMouthOverlay() {
    // VERIFICAÇÃO: Círculo rosa da boca visível APENAS para admin
    if (!this.isAdmin) {
      // Se não é admin, apenas desenhar texto "Fisgado!" se necessário
      if (this.showFisgadoText) {
        this.drawFisgadoTextOnly();
      }
      return;
    }

    const overlayCanvas = document.getElementById("fishMouthOverlay");
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    // Ajustar tamanho do overlay
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;

    // Limpar canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Desenhar círculo da boca para ambos os peixes
    this.drawFishMouth(
      ctx,
      overlayCanvas,
      this.fishCurrentPosition,
      this.fishDirection,
      1,
    );
    this.drawFishMouth(
      ctx,
      overlayCanvas,
      this.fish2CurrentPosition,
      this.fish2Direction,
      2,
    );

    // Desenhar texto "Fisgado!" se necessário - na posição do peixe ativo
    if (this.showFisgadoText) {
      const activeFishPosition =
        this.activeFish === 1
          ? this.fishCurrentPosition
          : this.fish2CurrentPosition;
      const fishPixelX = activeFishPosition.x * overlayCanvas.width;
      const fishPixelY = activeFishPosition.y * overlayCanvas.height;

      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 24px Arial";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;

      const text = "Fisgado!";
      const textMetrics = ctx.measureText(text);
      const textX = fishPixelX - textMetrics.width / 2;
      const textY = fishPixelY - 60;

      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
    }
  }

  // Método auxiliar para desenhar a boca de um peixe específico
  drawFishMouth(ctx, overlayCanvas, fishPosition, fishDirection, fishNumber) {
    // Usar a MESMA posição do peixe que o shader usa
    const fishUvX = fishPosition.x;
    const fishUvY = fishPosition.y;

    // Converter para pixels
    const fishPixelX = fishUvX * overlayCanvas.width;
    const fishPixelY = fishUvY * overlayCanvas.height;

    // A boca do peixe muda de lado dependendo da direção
    // Tamanho do peixe no shader: 0.08 width, 0.06 height
    const fishSizePixelX = 0.08 * overlayCanvas.width;

    // Lógica correta baseada no shader:
    // fishDirection > 0 = nada para direita, imagem flipada (PI), boca fica à DIREITA
    // fishDirection < 0 = nada para esquerda, imagem normal (0), boca fica à ESQUERDA
    let mouthOffsetX;
    if (fishDirection > 0) {
      mouthOffsetX = fishSizePixelX / 2 - 10; // Boca à direita - 10px mais próximo da ponta
    } else {
      mouthOffsetX = -(fishSizePixelX / 2) + 10; // Boca à esquerda + 10px mais próximo da ponta
    }

    const mouthX = fishPixelX + mouthOffsetX + (fishDirection > 0 ? -7 : 7); // -7px para direita ou +7px para esquerda (mais 4px próximo da boca)
    const mouthY = fishPixelY + 2; // +2px para baixo

    // Cores diferentes para cada peixe e destacar o peixe ativo
    const isActiveFish = this.activeFish === fishNumber;
    const baseColor = fishNumber === 1 ? "#0099ff" : "#00ff99"; // Azul para peixe 1, verde para peixe 2
    const activeColor = "#ff00ff"; // Rosa/magenta para peixe ativo

    const circleColor = isActiveFish ? activeColor : baseColor;
    const circleSize = isActiveFish ? 3 : 2; // Maior se for o peixe ativo
    const circleAlpha = isActiveFish ? 1.0 : 0.6; // Mais opaco se for o peixe ativo

    // Desenhar círculo da boca
    ctx.fillStyle = circleColor;
    ctx.globalAlpha = circleAlpha;
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, circleSize, 0, 2 * Math.PI);
    ctx.fill();

    // Borda do círculo
    ctx.strokeStyle = circleColor;
    ctx.lineWidth = isActiveFish ? 3 : 2;
    ctx.stroke();
    ctx.globalAlpha = 1.0; // Resetar alpha

    // Texto indicativo
    ctx.fillStyle = isActiveFish ? "#fff" : "#ccc";
    ctx.font = isActiveFish ? "bold 14px Arial" : "12px Arial";
    const fishLabel = fishNumber === 1 ? "AZUL" : "VERDE";
    const labelText = isActiveFish ? `${fishLabel} (ATIVO)` : fishLabel;
    ctx.fillText(labelText, mouthX - 25, mouthY - 35);
  }

  render() {
    if (!this.gl || !this.canvas) return;

    this.time += 0.016 * this.animationSpeed; // Animação da água
    this.fishTime += 0.016; // Peixe na mesma velocidade da água para evitar teleporte

    this.updateFishingGame();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Define atributos
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.enableVertexAttribArray(this.attributes.position);
    this.gl.vertexAttribPointer(
      this.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      16,
      0,
    );
    this.gl.enableVertexAttribArray(this.attributes.texCoord);
    this.gl.vertexAttribPointer(
      this.attributes.texCoord,
      2,
      this.gl.FLOAT,
      false,
      16,
      8,
    );

    // Define uniforms básicos
    this.gl.uniform1f(this.uniforms.time, this.time);
    this.gl.uniform1f(this.uniforms.fishTime, this.fishTime);
    this.gl.uniform1f(this.uniforms.waveIntensity, this.waveIntensity);
    this.gl.uniform1f(this.uniforms.distortionAmount, this.distortionAmount);
    this.gl.uniform2f(
      this.uniforms.resolution,
      this.canvas.width,
      this.canvas.height,
    );

    // Uniforms do jogo de pesca
    const gameStateValue =
      this.gameState === "idle"
        ? 0
        : this.gameState === "hook_cast"
          ? 1
          : this.gameState === "fish_reacting"
            ? 2
            : this.gameState === "fish_moving"
              ? 3
              : this.gameState === "fish_hooked"
                ? 4
                : 0;
    this.gl.uniform1f(this.uniforms.gameState, gameStateValue);
    this.gl.uniform2f(
      this.uniforms.hookPosition,
      this.hookPosition.x,
      this.hookPosition.y,
    );
    this.gl.uniform2f(
      this.uniforms.fishTargetPosition,
      this.fishCurrentPosition.x,
      this.fishCurrentPosition.y,
    );
    const showExclamationValue =
      this.gameState === "fish_hooked" && this.exclamationTime > 0 ? 1.0 : 0.0;

    this.gl.uniform1f(this.uniforms.showExclamation, showExclamationValue);
    this.gl.uniform1f(this.uniforms.fishTimeOffset, this.fishTimeOffset);

    // Calcular suavização de transição
    let transitionSmoothing = 0.0;
    if (this.transitionBackToNaturalTime > 0) {
      const elapsedTime = Date.now() - this.transitionBackToNaturalTime;
      const progress = Math.min(
        elapsedTime / this.transitionBackToNaturalDuration,
        1,
      );
      transitionSmoothing = 1.0 - progress;
    }
    this.gl.uniform1f(this.uniforms.transitionSmoothing, transitionSmoothing);
    this.gl.uniform2f(
      this.uniforms.transitionStartPosition,
      this.transitionStartPosition.x,
      this.transitionStartPosition.y,
    );
    this.gl.uniform1f(this.uniforms.fishDirection, this.fishDirection);
    this.gl.uniform1f(this.uniforms.fishAngle, this.fishAngle);

    // Uniforms para o segundo peixe (verde)
    this.gl.uniform2f(
      this.uniforms.fish2TargetPosition,
      this.fish2CurrentPosition.x,
      this.fish2CurrentPosition.y,
    );
    this.gl.uniform1f(this.uniforms.fish2Direction, this.fish2Direction);
    this.gl.uniform1f(this.uniforms.fish2Angle, this.fish2Angle || 0);
    this.gl.uniform1f(this.uniforms.activeFish, this.activeFish);

    // Uniforms de visibilidade dos peixes
    this.gl.uniform1f(
      this.uniforms.fish1Visible,
      this.fish1Visible ? 1.0 : 0.0,
    );
    this.gl.uniform1f(
      this.uniforms.fish2Visible,
      this.fish2Visible ? 1.0 : 0.0,
    );

    // Novos uniforms para área modular
    if (this.waterArea) {
      this.gl.uniform4f(
        this.uniforms.waterArea,
        this.waterArea.x,
        this.waterArea.y,
        this.waterArea.width,
        this.waterArea.height,
      );
      const shapeValue =
        this.waterArea.shape === "rectangle"
          ? 0
          : this.waterArea.shape === "circle"
            ? 1
            : this.waterArea.shape === "triangle"
              ? 2
              : 0;
      this.gl.uniform1f(this.uniforms.waterShape, shapeValue);
    } else {
      // Valores padrão se waterArea não estiver definida
      this.gl.uniform4f(this.uniforms.waterArea, 0.1, 0.4, 0.8, 0.5);
      this.gl.uniform1f(this.uniforms.waterShape, 0);
    }

    // Ativa texturas
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
    this.gl.uniform1i(this.uniforms.backgroundTexture, 0);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
    this.gl.uniform1i(this.uniforms.noiseTexture, 1);

    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fishTexture);
    this.gl.uniform1i(this.uniforms.fishTexture, 2);

    this.gl.activeTexture(this.gl.TEXTURE3);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fish2Texture);
    this.gl.uniform1i(this.uniforms.fish2Texture, 3);

    // Desenha
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

    // Desenhar overlay da boca do peixe
    this.drawFishMouthOverlay();

    requestAnimationFrame(() => this.render());
  }
}

// Componente do Minigame de Pesca estilo Stardew Valley
interface FishingMinigameProps {
  onComplete: (success: boolean) => void;
}

const FishingMinigame: React.FC<FishingMinigameProps> = ({ onComplete }) => {
  const [fishPosition, setFishPosition] = useState(50); // Posição do peixe (0-100)
  const [barPosition, setBarPosition] = useState(50); // Posição da barra do jogador (0-100)
  const [progress, setProgress] = useState(0); // Progresso de captura (0-100)
  const [gameTime, setGameTime] = useState(8000); // 8 segundos para capturar
  const [isHolding, setIsHolding] = useState(false);
  const [fishInBar, setFishInBar] = useState(false); // Para efeitos visuais
  const [progressGain, setProgressGain] = useState(false); // Para animação de ganho
  const [isLowTime, setIsLowTime] = useState(false); // Para efeitos de tempo baixo
  const [gameResult, setGameResult] = useState<
    "playing" | "success" | "failure"
  >("playing");

  // Refs para acessar valores atuais dentro do interval
  const fishPositionRef = useRef(fishPosition);
  const barPositionRef = useRef(barPosition);

  // Atualizar refs quando estados mudarem
  useEffect(() => {
    fishPositionRef.current = fishPosition;
  }, [fishPosition]);

  useEffect(() => {
    barPositionRef.current = barPosition;
  }, [barPosition]);

  const barSize = 20; // Tamanho da barra em %
  const fishSize = 8; // Tamanho do peixe em %

  useEffect(() => {
    const gameInterval = setInterval(() => {
      // Movimento aleatório do peixe
      setFishPosition((prev) => {
        const change = (Math.random() - 0.5) * 8;
        const newPos = Math.max(
          fishSize / 2,
          Math.min(100 - fishSize / 2, prev + change),
        );
        fishPositionRef.current = newPos;
        return newPos;
      });

      // Movimento da barra (cai por gravidade ou sobe se pressionado)
      setBarPosition((prev) => {
        let newPos = prev;
        if (isHolding) {
          newPos = Math.max(0, prev - 3); // Sobe
        } else {
          newPos = Math.min(100, prev + 2); // Desce por gravidade
        }
        barPositionRef.current = newPos;
        return newPos;
      });

      // Verificar se o peixe está na barra
      const fishIsInBar =
        Math.abs(fishPositionRef.current - barPositionRef.current) <
        (barSize + fishSize) / 2;

      setFishInBar(fishIsInBar);

      setProgress((prev) => {
        if (fishIsInBar) {
          return Math.min(100, prev + 2); // Progresso aumenta
        } else {
          return Math.max(0, prev - 1); // Progresso diminui
        }
      });

      // Atualizar progressGain separadamente
      if (fishIsInBar) {
        setProgressGain(true);
      }

      // Diminuir tempo
      setGameTime((prev) => {
        const newTime = prev - 50;
        if (newTime <= 0) {
          onComplete(false); // Tempo esgotado
        }
        return newTime;
      });

      // Atualizar isLowTime separadamente usando um useEffect
      // (será criado após o useEffect do gameInterval)
    }, 50);

    return () => clearInterval(gameInterval);
  }, [isHolding, onComplete, barSize, fishSize]);

  useEffect(() => {
    if (progress >= 100 && gameResult === "playing") {
      setGameResult("success");
      setTimeout(() => onComplete(true), 1500); // Delay para mostrar animação
    }
  }, [progress, gameResult, onComplete]);

  // Atualizar isLowTime baseado no gameTime
  useEffect(() => {
    setIsLowTime(gameTime < 3000);
  }, [gameTime]);

  // Gerenciar progressGain com timeout
  useEffect(() => {
    if (progressGain) {
      const timer = setTimeout(() => setProgressGain(false), 200);
      return () => clearTimeout(timer);
    }
  }, [progressGain]);

  // Atualizar resultado para failure quando tempo acabar
  useEffect(() => {
    if (gameTime <= 0 && gameResult === "playing") {
      setGameResult("failure");
    }
  }, [gameTime, gameResult]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsHolding(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsHolding(false);
      }
    };

    const handleMouseDown = () => setIsHolding(true);
    const handleMouseUp = () => setIsHolding(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md mx-auto"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.5,
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl">
            <h2 className="text-2xl font-bold text-center">
              🎣 Minigame de Pesca
            </h2>
            <p className="text-blue-100 text-center text-sm mt-2">
              Mantenha o peixe na ��rea verde!
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Bar */}
            <motion.div
              className={`flex items-center justify-between rounded-2xl p-4 transition-all duration-300 ${
                fishInBar
                  ? "bg-green-50 border-2 border-green-200"
                  : isLowTime
                    ? "bg-red-50 border-2 border-red-200"
                    : "bg-gray-50"
              }`}
              animate={fishInBar ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3, repeat: fishInBar ? Infinity : 0 }}
            >
              <div className="flex items-center space-x-2">
                <motion.div
                  className={`w-3 h-3 rounded-full ${
                    fishInBar
                      ? "bg-gradient-to-r from-green-400 to-emerald-500"
                      : "bg-gradient-to-r from-blue-400 to-purple-500"
                  }`}
                  animate={
                    fishInBar
                      ? { scale: [1, 1.3, 1] }
                      : { opacity: [1, 0.5, 1] }
                  }
                  transition={{ duration: 0.5, repeat: Infinity }}
                ></motion.div>
                <span
                  className={`text-sm font-medium ${
                    fishInBar ? "text-green-700" : "text-gray-700"
                  }`}
                >
                  {fishInBar ? "Capturando!" : "Progresso"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <motion.span
                  className="text-2xl"
                  animate={isLowTime ? { rotate: [-5, 5, -5] } : {}}
                  transition={{
                    duration: 0.3,
                    repeat: isLowTime ? Infinity : 0,
                  }}
                >
                  {isLowTime ? "🚨" : "⏱️"}
                </motion.span>
                <motion.span
                  className={`text-lg font-bold ${
                    isLowTime ? "text-red-500" : "text-gray-700"
                  }`}
                  animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
                  transition={{
                    duration: 0.5,
                    repeat: isLowTime ? Infinity : 0,
                  }}
                >
                  {Math.ceil(gameTime / 1000)}s
                </motion.span>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-600">
                <motion.span
                  animate={
                    progressGain
                      ? {
                          scale: [1, 1.1, 1],
                          color: ["#374151", "#10b981", "#374151"],
                        }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                >
                  Captura
                </motion.span>
                <motion.span
                  animate={progressGain ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className={progress > 75 ? "text-green-600 font-bold" : ""}
                >
                  {Math.round(progress)}%
                </motion.span>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <motion.div
                  className={`h-full transition-all duration-300 ease-out rounded-full relative ${
                    progress > 75
                      ? "bg-gradient-to-r from-green-500 to-emerald-600"
                      : progress > 50
                        ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                        : progress > 25
                          ? "bg-gradient-to-r from-orange-400 to-red-500"
                          : "bg-gradient-to-r from-red-500 to-pink-600"
                  }`}
                  style={{ width: `${progress}%` }}
                  animate={
                    progressGain
                      ? {
                          boxShadow: [
                            "0 0 0 rgba(16, 185, 129, 0)",
                            "0 0 20px rgba(16, 185, 129, 0.8)",
                            "0 0 0 rgba(16, 185, 129, 0)",
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 0.4 }}
                >
                  <div className="h-full w-full bg-white/30 animate-pulse"></div>
                  {/* Sparkle effect */}
                  {progressGain && (
                    <motion.div
                      className="absolute right-0 top-0 w-2 h-2 bg-white rounded-full"
                      initial={{ scale: 0, x: 0 }}
                      animate={{ scale: [0, 1, 0], x: [0, 10, 20] }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                </motion.div>
                {/* Progress milestone markers */}
                {[25, 50, 75].map((milestone) => (
                  <div
                    key={milestone}
                    className={`absolute top-0 w-px h-full bg-white/50 ${
                      progress >= milestone ? "opacity-100" : "opacity-30"
                    }`}
                    style={{ left: `${milestone}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Game Area */}
            <div className="flex justify-center">
              <div className="relative w-20 h-80 bg-gradient-to-b from-blue-200 via-blue-300 to-blue-500 rounded-2xl border-4 border-blue-600 shadow-inner overflow-hidden">
                {/* Water Animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/20 animate-pulse"></div>

                {/* Peixe */}
                <motion.div
                  className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: `${fishPosition}%` }}
                  animate={
                    fishInBar
                      ? {
                          scale: [1, 1.1, 1],
                          rotate: [0, -5, 5, 0],
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.5,
                    repeat: fishInBar ? Infinity : 0,
                  }}
                >
                  <div className="relative">
                    <motion.div
                      className={`w-12 h-6 rounded-full border-2 shadow-lg flex items-center justify-center ${
                        fishInBar
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 border-yellow-600"
                          : "bg-gradient-to-r from-orange-400 to-red-500 border-orange-600"
                      }`}
                      animate={
                        fishInBar
                          ? {
                              boxShadow: [
                                "0 0 0 rgba(251, 191, 36, 0)",
                                "0 0 15px rgba(251, 191, 36, 0.8)",
                                "0 0 0 rgba(251, 191, 36, 0)",
                              ],
                            }
                          : {}
                      }
                      transition={{
                        duration: 0.6,
                        repeat: fishInBar ? Infinity : 0,
                      }}
                    >
                      <span className="text-sm">🐟</span>
                    </motion.div>

                    {/* Bubble effects */}
                    <motion.div
                      className="absolute -top-2 -right-1 w-2 h-2 bg-white/60 rounded-full"
                      animate={{ y: [-2, -8, -2], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute -top-1 -left-2 w-1.5 h-1.5 bg-white/40 rounded-full"
                      animate={{ y: [-1, -6, -1], opacity: [0.4, 0, 0.4] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: 0.3,
                      }}
                    />

                    {/* Success particles */}
                    {fishInBar && (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                            style={{
                              top: "50%",
                              left: "50%",
                            }}
                            initial={{ scale: 0, x: 0, y: 0 }}
                            animate={{
                              scale: [0, 1, 0],
                              x: [0, (Math.random() - 0.5) * 20],
                              y: [0, (Math.random() - 0.5) * 20],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Barra do jogador */}
                <motion.div
                  className={`absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-xl border-3 shadow-lg transition-all duration-100 ${
                    fishInBar
                      ? "bg-gradient-to-r from-green-400 to-emerald-500 border-green-600 shadow-green-300/50"
                      : isHolding
                        ? "bg-gradient-to-r from-green-300 to-emerald-400 border-green-500 shadow-green-300/40"
                        : "bg-gradient-to-r from-emerald-300 to-green-400 border-emerald-500 shadow-emerald-300/30"
                  }`}
                  style={{
                    top: `${barPosition}%`,
                    width: "52px",
                    height: `${barSize}%`,
                    minHeight: "24px",
                  }}
                  animate={
                    fishInBar
                      ? {
                          boxShadow: [
                            "0 0 0 rgba(34, 197, 94, 0)",
                            "0 0 20px rgba(34, 197, 94, 0.9)",
                            "0 0 0 rgba(34, 197, 94, 0)",
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.5,
                    repeat: fishInBar ? Infinity : 0,
                  }}
                >
                  <div className="h-full w-full bg-white/30 rounded-lg relative overflow-hidden">
                    {/* Energy bar effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={isHolding ? { x: [-100, 100] } : {}}
                      transition={{
                        duration: 0.8,
                        repeat: isHolding ? Infinity : 0,
                      }}
                    />
                  </div>
                </motion.div>

                {/* Depth lines */}
                {[20, 40, 60, 80].map((depth) => (
                  <div
                    key={depth}
                    className="absolute left-0 right-0 h-px bg-white/20"
                    style={{ top: `${depth}%` }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isHolding
                      ? "bg-green-500 text-white shadow-lg"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isHolding ? "⬆️ SUBINDO" : "⬇️ DESCENDO"}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">ESPAÇO</span> ou{" "}
                <span className="font-semibold">CLIQUE</span> para subir a barra
              </p>
            </div>
          </div>

          {/* Success/Failure Overlay */}
          <AnimatePresence>
            {gameResult !== "playing" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className={`text-center p-6 rounded-2xl ${
                    gameResult === "success"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    delay: 0.2,
                  }}
                >
                  <motion.div
                    className="text-4xl mb-2"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                  >
                    {gameResult === "success" ? "🎉" : "😞"}
                  </motion.div>
                  <h3 className="text-xl font-bold mb-1">
                    {gameResult === "success"
                      ? "Peixe Capturado!"
                      : "Peixe Escapou!"}
                  </h3>
                  <p className="text-sm opacity-90">
                    {gameResult === "success"
                      ? "Parabéns! Você conseguiu!"
                      : "Tente novamente da próxima vez!"}
                  </p>

                  {/* Celebration particles for success */}
                  {gameResult === "success" && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                          style={{
                            top: "50%",
                            left: "50%",
                          }}
                          initial={{ scale: 0, x: 0, y: 0 }}
                          animate={{
                            scale: [0, 1, 0],
                            x: [0, Math.cos((i / 8) * Math.PI * 2) * 60],
                            y: [0, Math.sin((i / 8) * Math.PI * 2) * 60],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const FishingScreenModular: React.FC = () => {
  console.log("🏏 FishingScreenModular component rendering...");
  console.log("🐟 FishingService loaded:", !!fishingService);
  console.log("🐟 Active fish count:", fishingService.getActiveFish().length);
  console.log("🐟 Active fish details:", fishingService.getActiveFish());
  console.log("���� Fishing stats:", fishingService.getFishingStats());
  const { setCurrentScreen, addToInventory, addNotification } = useGameStore();
  const { user } = useAuthStore();
  const waterEffectRef = useRef<ModularWaterEffect | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Estados
  const [waterArea, setWaterArea] = useState<WaterArea>({
    x: 0.1, // 10% da tela
    y: 0.4, // 40% da tela
    width: 0.8, // 80% da largura
    height: 0.5, // 50% da altura
    shape: "rectangle",
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [showMinigame, setShowMinigame] = useState(false);

  // Os peixes existem no WebGL - não precisamos de estado adicional

  useEffect(() => {
    console.log("🎮 showMinigame state changed:", showMinigame);
  }, [showMinigame]);

  // Helper function para redefinir o callback onGameStart
  const redefineGameStartCallback = useCallback(() => {
    if (waterEffectRef.current) {
      const callback = () => {
        console.log("🎮 Fish caught! Opening minigame...");

        // Abrir o minigame primeiro
        setShowMinigame(true);

        if (!waterEffectRef.current) {
          console.error("❌ WaterEffect ref is null!");
          return;
        }

        // Apenas abrir o minigame - a captura será feita após o sucesso do minigame
        console.log("🎮 Opening fishing minigame...");
        setShowMinigame(true);

        // Código removido - agora a captura acontece no handleMinigameComplete
        // Código legacy removido - não será executado
        if (false) {
          console.log(`�� Attempting to catch fish: legacy fish`);
          // Pescar o peixe
          const caughtFish = null; // Legacy code - not executed
          console.log("🐟 Caught fish result:", caughtFish);

          if (caughtFish) {
            // Converter peixe para item e adicionar ao inventário
            const fishItem = fishingService.convertFishToItem(caughtFish);
            console.log("🐟 Fish converted to item:", fishItem);

            // Adicionar ao inventário através do gameStore
            console.log("🎒 Adding to inventory...");
            addToInventory(fishItem)
              .then((success) => {
                console.log("🎒 AddToInventory result:", success);
                if (success) {
                  addNotification({
                    type: "success",
                    title: "Peixe pescado!",
                    message: `Você pescou um ${caughtFish.name}!`,
                    isRead: false,
                  });
                  console.log(
                    `🐟 Successfully caught and added ${caughtFish.name} to inventory`,
                  );
                } else {
                  console.error("Failed to add fish to inventory");
                  addNotification({
                    type: "error",
                    title: "Erro",
                    message: "Falha ao adicionar peixe ao inventário.",
                    isRead: false,
                  });
                }
              })
              .catch((error) => {
                console.error("🎒 Error adding to inventory:", error);
              });
          } else {
            console.error("❌ Failed to catch fish");
          }
        } else {
          console.log("🎣 Fallback case - no legacy logic needed");
          console.log("🎣 User exists:", !!user);
          // Esse bloco não é mais necessário pois não fazemos captura aqui
        }
      };

      waterEffectRef.current.onGameStart = callback;
      waterEffectRef.current.onGameStartBackup = callback; // Salvar backup
      console.log("🔄 Callback defined and backed up");
    }
  }, [user, addToInventory, addNotification]);

  // Callback otimizado para o minigame
  const handleMinigameComplete = useCallback(
    async (success: boolean) => {
      console.log("🎮 Minigame completed with result:", success);
      setShowMinigame(false);

      if (success && waterEffectRef.current && user) {
        // Se minigame foi bem-sucedido, capturar peixe do WebGL
        const caughtFishData = waterEffectRef.current.catchActiveFish();
        console.log(
          "🐟 Fish caught after successful minigame:",
          caughtFishData,
        );

        if (caughtFishData) {
          // Criar peixe com tamanho aleatório
          const { createFish } = await import("../../types/fish");
          const newFish = createFish(
            caughtFishData.species as "Peixinho Azul" | "Peixinho Verde",
            caughtFishData.position.x,
            caughtFishData.position.y,
          );

          // Marcar como capturado
          newFish.stats.caught = true;
          newFish.stats.caughtAt = new Date();
          newFish.stats.caughtByUserId = user.id;

          // Converter para item e adicionar ao inventário
          const fishItem = fishingService.convertFishToItem(newFish);

          try {
            const inventorySuccess = await addToInventory(fishItem);
            if (inventorySuccess) {
              addNotification({
                type: "success",
                title: "Peixe capturado!",
                message: `Você capturou um ${newFish.name} (Tamanho ${newFish.size})!`,
                isRead: false,
              });
              console.log(`🎣 Successfully added ${newFish.name} to inventory`);
            } else {
              throw new Error("Failed to add to inventory");
            }
          } catch (error) {
            console.error("Error adding fish to inventory:", error);
            addNotification({
              type: "error",
              title: "Erro",
              message: "Falha ao adicionar peixe ao inventário.",
              isRead: false,
            });
          }
        }
      } else if (!success) {
        console.log("🐟 Fish escaped during minigame");
        addNotification({
          type: "warning",
          title: "Peixe escapou!",
          message: "O peixe conseguiu escapar. Tente novamente!",
          isRead: false,
        });
      }

      // Reset do jogo e redefinir callback apenas se não foi sucesso (pois catchActiveFish já resetou)
      if (waterEffectRef.current && !success) {
        waterEffectRef.current.resetFishingGame();
      }

      // IMPORTANTE: Redefinir o callback onGameStart após o reset
      redefineGameStartCallback();
    },
    [redefineGameStartCallback, user, addToInventory, addNotification],
  );
  const [fishingSettings, setFishingSettings] =
    useState<FishingSettings | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [editMode, setEditMode] = useState(false); // Modo de edição da área da água
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const isAdmin = user?.isAdmin || false;

  // Os peixes do WebGL já estão sempre nadando, não precisamos spawnar

  // Captura é gerenciada pelo sistema WebGL

  // Cleanup do fishingService
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up fishingService");
      fishingService.cleanup();
    };
  }, []);

  // Load fishing settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await fishingSettingsService.getFishingSettings();
      setFishingSettings(settings);
    };
    loadSettings();
  }, []);

  // Initialize water effect
  useEffect(() => {
    // Definir referência para o listener no escopo do useEffect
    let globalClickHandler: ((e: MouseEvent) => void) | null = null;

    const timer = setTimeout(() => {
      try {
        const waterEffect = new ModularWaterEffect(waterArea, isAdmin);
        waterEffectRef.current = waterEffect;
        redefineGameStartCallback();

        // Os peixes WebGL já estão nadando automaticamente
        console.log("���� Os 2 peixes WebGL já estão nadando automaticamente");

        // NOVA LÓGICA: Clique em QUALQUER LUGAR da tela durante mordida
        globalClickHandler = (e: MouseEvent) => {
          const currentTime = Date.now();
          const elapsedTime = currentTime - waterEffect.exclamationStartTime;
          console.log("🖱️ Global click detected:", {
            gameState: waterEffect.gameState,
            canClick: waterEffect.canClickExclamation,
            exclamationTime: waterEffect.exclamationTime,
            elapsedTime: elapsedTime,
            hasCallback: !!waterEffect.onGameStart,
            hasBackup: !!waterEffect.onGameStartBackup,
          });

          if (
            waterEffect.gameState === "fish_hooked" &&
            waterEffect.canClickExclamation
          ) {
            console.log(
              "���� Player clicked anywhere during fish bite - triggering minigame!",
            );
            // Garantir que o callback está definido antes de tentar abrir minigame
            if (!waterEffect.onGameStart && waterEffect.onGameStartBackup) {
              console.log("🔄 Restoring callback before opening minigame");
              waterEffect.onGameStart = waterEffect.onGameStartBackup;
            }
            const success = waterEffect.handleExclamationClick();
            console.log("��� Minigame trigger result:", success);
          } else {
            console.log("❌ Click ignored - conditions not met");
          }
        };

        // Adicionar listener GLOBAL para qualquer clique na tela
        if (globalClickHandler) {
          document.addEventListener("click", globalClickHandler);
        }

        if (fishingSettings) {
          waterEffect.waveIntensity = fishingSettings.waveIntensity;
          waterEffect.distortionAmount = fishingSettings.distortionAmount;
          waterEffect.animationSpeed = fishingSettings.animationSpeed;

          // Apply background if custom image is set
          if (fishingSettings.backgroundImageUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              if (waterEffect.updateBackgroundFromImage) {
                waterEffect.updateBackgroundFromImage(img);
              }
            };
            img.src = fishingSettings.backgroundImageUrl;
          }
        }
      } catch (error) {
        console.error("Error initializing ModularWaterEffect:", error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Remover listener global quando componente for desmontado
      if (globalClickHandler) {
        document.removeEventListener("click", globalClickHandler);
      }
    };
  }, [fishingSettings]);

  // Atualizar área da água no effect
  useEffect(() => {
    if (waterEffectRef.current) {
      waterEffectRef.current.updateWaterArea(waterArea);
    }
  }, [waterArea]);

  // Detectar Shift key para modo de arraste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !e.repeat) {
        // !e.repeat previne múltiplos eventos
        setIsShiftPressed((prev) => {
          if (prev) {
            setIsDragging(false); // Para o arraste se estiver desativando
          }
          return !prev; // Toggle
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Removido para permitir toggle - Shift agora funciona como toggle
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Handle settings updates (admin only)
  const handleSettingUpdate = async (
    setting: keyof FishingSettings,
    value: number,
  ) => {
    if (!isAdmin) return;

    // Update local state immediately for responsiveness
    if (fishingSettings) {
      const updatedSettings = {
        ...fishingSettings,
        [setting]: value,
      };

      setFishingSettings(updatedSettings);

      // Also update WaterEffect immediately if available
      if (waterEffectRef.current) {
        const waterEffect = waterEffectRef.current;
        if (setting === "waveIntensity") waterEffect.waveIntensity = value;
        if (setting === "distortionAmount")
          waterEffect.distortionAmount = value;
        if (setting === "animationSpeed") waterEffect.animationSpeed = value;
      }
    }

    setIsUpdatingSettings(true);

    const updates: any = {};
    updates[setting] = value;

    const result = await fishingSettingsService.updateFishingSettings(updates);

    if (!result.success) {
      console.error("Failed to update setting:", result.message);
      // Revert local state if database update failed
      if (fishingSettings) {
        setFishingSettings(fishingSettings);
      }
    }

    setIsUpdatingSettings(false);
  };

  // Handle background image upload (admin only)
  const handleBackgroundUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isAdmin || !event.target.files?.[0]) {
      return;
    }

    const file = event.target.files[0];
    setIsUpdatingSettings(true);

    const result = await fishingSettingsService.uploadBackgroundImage(file);

    if (result.success && result.imageUrl) {
      // Update local state immediately
      if (fishingSettings) {
        const updatedSettings = {
          ...fishingSettings,
          backgroundImageUrl: result.imageUrl,
        };
        setFishingSettings(updatedSettings);

        // Apply background to WaterEffect immediately
        if (waterEffectRef.current && result.imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (waterEffectRef.current?.updateBackgroundFromImage) {
              waterEffectRef.current.updateBackgroundFromImage(img);
            }
          };
          img.src = result.imageUrl;
        }
      }
    } else {
      console.error("Failed to upload background:", result.message);
    }

    setIsUpdatingSettings(false);

    // Reset file input
    event.target.value = "";
  };

  // Renderizar overlay admin
  useEffect(() => {
    if (!isAdmin || !overlayCanvasRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar contorno da área da água para admin
    const pixelX = waterArea.x * canvas.width;
    const pixelY = waterArea.y * canvas.height;
    const pixelWidth = waterArea.width * canvas.width;
    const pixelHeight = waterArea.height * canvas.height;

    ctx.strokeStyle = isDragging
      ? "#ff6b6b"
      : isShiftPressed
        ? "#4A90E2"
        : "#333";
    ctx.lineWidth = isShiftPressed ? 4 : 3;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();
    switch (waterArea.shape) {
      case "rectangle":
        ctx.rect(pixelX, pixelY, pixelWidth, pixelHeight);
        break;
      case "circle":
        const centerX = pixelX + pixelWidth / 2;
        const centerY = pixelY + pixelHeight / 2;
        const radius = Math.min(pixelWidth, pixelHeight) / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        break;
      case "triangle":
        const tx1 = pixelX + pixelWidth / 2;
        const ty1 = pixelY;
        const tx2 = pixelX;
        const ty2 = pixelY + pixelHeight;
        const tx3 = pixelX + pixelWidth;
        const ty3 = pixelY + pixelHeight;
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.lineTo(tx3, ty3);
        ctx.closePath();
        break;
    }
    ctx.stroke();
  }, [waterArea, isAdmin, isDragging, isShiftPressed]);

  // Verificar se ponto está na área da água
  const isPointInWaterArea = (x: number, y: number): boolean => {
    const relX = x / window.innerWidth;
    const relY = y / window.innerHeight;

    switch (waterArea.shape) {
      case "rectangle":
        return (
          relX >= waterArea.x &&
          relX <= waterArea.x + waterArea.width &&
          relY >= waterArea.y &&
          relY <= waterArea.y + waterArea.height
        );
      case "circle":
        const centerX = waterArea.x + waterArea.width / 2;
        const centerY = waterArea.y + waterArea.height / 2;
        const radius = Math.min(waterArea.width, waterArea.height) / 2;
        const distance = Math.sqrt(
          (relX - centerX) ** 2 + (relY - centerY) ** 2,
        );
        return distance <= radius;
      case "triangle":
        // Implementaç��o básica de triângulo
        const tx1 = waterArea.x + waterArea.width / 2;
        const ty1 = waterArea.y;
        const tx2 = waterArea.x;
        const ty2 = waterArea.y + waterArea.height;
        const tx3 = waterArea.x + waterArea.width;
        const ty3 = waterArea.y + waterArea.height;

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
      default:
        return false;
    }
  };

  // Handlers para arrastar área da água
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAdmin) return;

    // Verificar se Shift está pressionado para arrastar
    if (!isShiftPressed) return;

    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isPointInWaterArea(x, y)) {
      setIsDragging(true);
      setDragOffset({
        x: x / window.innerWidth - waterArea.x,
        y: y / window.innerHeight - waterArea.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isAdmin || !isDragging) return;

    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const relX = x / window.innerWidth;
    const relY = y / window.innerHeight;

    setWaterArea((prev) => ({
      ...prev,
      x: relX - dragOffset.x,
      y: relY - dragOffset.y,
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
      {/* Water Canvas (WebGL) */}
      <canvas
        id="waterCanvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          zIndex: 10,
        }}
      />

      {/* Overlay Canvas para controles admin (Shift + arrastar) */}
      {isAdmin && (
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "block",
            zIndex: isShiftPressed ? 25 : 15, // Fica acima quando Shift pressionado
            pointerEvents: isShiftPressed ? "all" : "none", // Só captura eventos quando Shift pressionado
            cursor: isDragging
              ? "grabbing"
              : isShiftPressed
                ? "grab"
                : "default",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}

      {/* Fishing Rod Component */}
      <FishingRod
        waterArea={waterArea}
        isFishBiting={() => {
          // Verificar se peixe está mordendo (fish_hooked + canClickExclamation)
          return (
            waterEffectRef.current?.gameState === "fish_hooked" &&
            waterEffectRef.current?.canClickExclamation === true
          );
        }}
        onHookCast={(x, y) => {
          // Verificar se o clique está dentro da área de água antes de iniciar o jogo
          if (isPointInWaterArea(x, y)) {
            const uvX = x / window.innerWidth;
            const uvY = y / window.innerHeight;

            if (waterEffectRef.current) {
              waterEffectRef.current.startFishingGame(uvX, uvY);
            }
          }
        }}
        onLineReeled={() => {
          console.log("Line reeled in - completely resetting fishing game");
          if (waterEffectRef.current) {
            // Resetar posição do anzol para indicar que foi recolhido
            waterEffectRef.current.hookPosition = { x: 0.5, y: 0.5 };
            waterEffectRef.current.resetFishingGame();
            // Redefinir callback onGameStart
            redefineGameStartCallback();
          }
        }}
      />

      {/* Os peixes são renderizados diretamente no WebGL */}

      {/* Overlay para mostrar posição da boca do peixe */}
      <canvas
        id="fishMouthOverlay"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 20,
        }}
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
            background: "rgba(255, 255, 255, 0.95)",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #e5e5e5",
            minWidth: "250px",
          }}
        >
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            CONTROLES DE ADMINISTRADOR
          </div>

          {/* Botão para alternar modo de edição */}
          {/* Instruções de uso */}
          <div
            style={{
              marginBottom: "15px",
              fontSize: "12px",
              color: "#666",
              background: "#f0f8ff",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            🔧 <strong>Reposicionar área:</strong> Segure{" "}
            <kbd
              style={{
                background: "#e0e0e0",
                padding: "2px 4px",
                borderRadius: "3px",
              }}
            >
              Shift
            </kbd>{" "}
            + arraste a área tracejada
            <br />
            📏 <strong>Redimensionar:</strong> Use os sliders abaixo
          </div>

          {/* Controles de efeitos de água */}
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                color: "#000000",
                marginBottom: "5px",
              }}
            >
              Intensidade das Ondas:{" "}
              {(fishingSettings?.waveIntensity || 0.5).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={(fishingSettings?.waveIntensity || 0.5) * 100}
              onChange={(e) => {
                handleSettingUpdate(
                  "waveIntensity",
                  parseInt(e.target.value) / 100,
                );
              }}
              style={{ width: "100%" }}
              disabled={isUpdatingSettings}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                color: "#000000",
                marginBottom: "5px",
              }}
            >
              Distorção: {(fishingSettings?.distortionAmount || 0.3).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={(fishingSettings?.distortionAmount || 0.3) * 100}
              onChange={(e) => {
                handleSettingUpdate(
                  "distortionAmount",
                  parseInt(e.target.value) / 100,
                );
              }}
              style={{ width: "100%" }}
              disabled={isUpdatingSettings}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                color: "#000000",
                marginBottom: "5px",
              }}
            >
              Velocidade: {(fishingSettings?.animationSpeed || 1.0).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={(fishingSettings?.animationSpeed || 1.0) * 100}
              onChange={(e) => {
                handleSettingUpdate(
                  "animationSpeed",
                  parseInt(e.target.value) / 100,
                );
              }}
              style={{ width: "100%" }}
              disabled={isUpdatingSettings}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                color: "#000000",
                marginBottom: "5px",
              }}
            >
              Background Personalizado
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              style={{ fontSize: "0.875rem", width: "100%" }}
              disabled={isUpdatingSettings}
            />
            {fishingSettings?.backgroundImageUrl && (
              <div
                style={{ fontSize: "0.75rem", color: "#666", marginTop: "2px" }}
              >
                ✅ Imagem personalizada ativa
              </div>
            )}
          </div>

          {/* Separador */}
          <hr
            style={{
              margin: "15px 0",
              border: "none",
              borderTop: "1px solid #e5e5e5",
            }}
          />

          {/* Controles de área da água */}
          <div
            style={{
              marginBottom: "10px",
              fontWeight: "bold",
              fontSize: "0.9rem",
            }}
          >
            ÁREA DA ÁGUA
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Forma da Água:
            </label>
            <select
              value={waterArea.shape}
              onChange={(e) => {
                const newShape = e.target.value as WaterArea["shape"];
                setWaterArea((prev) => {
                  // Se for círculo, igualar largura e altura
                  if (newShape === "circle") {
                    const size = Math.min(prev.width, prev.height);
                    return {
                      ...prev,
                      shape: newShape,
                      width: size,
                      height: size,
                    };
                  }
                  return {
                    ...prev,
                    shape: newShape,
                  };
                });
              }}
              style={{ width: "100%", padding: "5px" }}
            >
              <option value="rectangle">Retângulo</option>
              <option value="circle">Círculo</option>
              <option value="triangle">Triângulo</option>
            </select>
          </div>

          {waterArea.shape === "circle" ? (
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Tamanho:{" "}
                {(Math.min(waterArea.width, waterArea.height) * 100).toFixed(0)}
                %
              </label>
              <input
                type="range"
                min="10"
                max="80"
                value={Math.min(waterArea.width, waterArea.height) * 100}
                onChange={(e) => {
                  const size = parseInt(e.target.value) / 100;
                  setWaterArea((prev) => ({
                    ...prev,
                    width: size,
                    height: size,
                  }));
                }}
                style={{ width: "100%" }}
              />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Largura: {(waterArea.width * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={waterArea.width * 100}
                  onChange={(e) =>
                    setWaterArea((prev) => ({
                      ...prev,
                      width: parseInt(e.target.value) / 100,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Altura: {(waterArea.height * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={waterArea.height * 100}
                  onChange={(e) =>
                    setWaterArea((prev) => ({
                      ...prev,
                      height: parseInt(e.target.value) / 100,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            {isShiftPressed
              ? "🎯 Shift ativo - arraste a área para reposicionar"
              : "⌨�� Segure Shift e arraste a área tracejada para reposicionar"}
          </div>
        </div>
      )}

      {/* Admin Debug Panel for Fish */}
      {isAdmin && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "320px",
            zIndex: 30,
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            border: "1px solid #555",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "11px",
            minWidth: "200px",
            maxWidth: "300px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            🐟 WEBGL FISH DEBUG
          </div>
          <div>🔵 Peixinho Azul (tamanho 4)</div>
          <div>🟢 Peixinho Verde (tamanho 3)</div>
          {waterEffectRef.current &&
            waterEffectRef.current.fishCurrentPosition &&
            waterEffectRef.current.fish2CurrentPosition && (
              <>
                <div style={{ marginTop: "5px" }}>
                  <strong>Estado:</strong> {waterEffectRef.current.gameState}
                </div>
                <div>
                  <strong>Peixe Ativo:</strong>{" "}
                  {waterEffectRef.current.activeFish === 1 ? "Azul" : "Verde"}
                </div>
                <div style={{ fontSize: "9px", marginTop: "5px" }}>
                  <strong>Azul:</strong>{" "}
                  {waterEffectRef.current.fish1Visible
                    ? "🐟 Visível"
                    : "🚫 Capturado"}
                  {!waterEffectRef.current.fish1Visible &&
                    waterEffectRef.current.fish1RespawnTime > 0 && (
                      <span>
                        {" "}
                        (respawn em{" "}
                        {Math.ceil(
                          (waterEffectRef.current.fish1RespawnTime -
                            Date.now()) /
                            1000,
                        )}
                        s)
                      </span>
                    )}
                </div>
                <div style={{ fontSize: "9px" }}>
                  <strong>Verde:</strong>{" "}
                  {waterEffectRef.current.fish2Visible
                    ? "🐟 Visível"
                    : "🚫 Capturado"}
                  {!waterEffectRef.current.fish2Visible &&
                    waterEffectRef.current.fish2RespawnTime > 0 && (
                      <span>
                        {" "}
                        (respawn em{" "}
                        {Math.ceil(
                          (waterEffectRef.current.fish2RespawnTime -
                            Date.now()) /
                            1000,
                        )}
                        s)
                      </span>
                    )}
                </div>
                <div
                  style={{ fontSize: "8px", marginTop: "3px", color: "#ccc" }}
                >
                  Pos. Azul: (
                  {waterEffectRef.current.fishCurrentPosition.x.toFixed(2)},{" "}
                  {waterEffectRef.current.fishCurrentPosition.y.toFixed(2)})
                </div>
                <div style={{ fontSize: "8px", color: "#ccc" }}>
                  Pos. Verde: (
                  {waterEffectRef.current.fish2CurrentPosition.x.toFixed(2)},{" "}
                  {waterEffectRef.current.fish2CurrentPosition.y.toFixed(2)})
                </div>
              </>
            )}
          <div style={{ fontSize: "9px", marginTop: "5px", color: "#ccc" }}>
            Os peixes WebGL nadam automaticamente
          </div>
        </div>
      )}

      {/* Minigame de Pesca estilo Stardew Valley */}
      {showMinigame && <FishingMinigame onComplete={handleMinigameComplete} />}

      {/* Modal removido - showFishingModal */}
      {false && (
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
              ���� Peixe Fisgado!
            </h2>
            <p
              style={{ color: "#666", marginBottom: "30px", fontSize: "16px" }}
            >
              Parabéns! Você conseguiu fisgar um peixe na área da água.
            </p>

            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => {
                  setShowFishingModal(false);
                  if (waterEffectRef.current) {
                    waterEffectRef.current.resetFishingGame();
                  }
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
                  if (waterEffectRef.current) {
                    waterEffectRef.current.resetFishingGame();
                  }
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
