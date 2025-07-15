import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import {
  fishingSettingsService,
  FishingSettings,
} from "../../services/fishingSettingsService";
import { FishingRod } from "../Game/FishingRod";

// Tipos para o sistema modular
interface WaterArea {
  x: number; // Posição X relativa (0-1)
  y: number; // Posiç���o Y relativa (0-1)
  width: number; // Largura relativa (0-1)
  height: number; // Altura relativa (0-1)
  shape: "rectangle" | "circle" | "triangle";
}

// WebGL Water Effect Class Modular - NOVO: Movimento aleat���rio livre com rotação 360° baseado na área definida
class ModularWaterEffect {
  constructor(waterArea) {
    this.canvas = document.getElementById("waterCanvas");
    this.waterArea = waterArea;

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
    this.fishTargetPosition = { x: 0.5, y: 0.65 };
    this.fishCurrentPosition = { x: 0.5, y: 0.65 }; // Posição atual real do peixe
    this.fishVelocity = { x: 0, y: 0 }; // Velocidade atual do peixe
    this.fishDirection = 1; // 1 = direita, -1 = esquerda

    // Sistema de movimento orgânico
    this.fishDesiredDirection = { x: 1, y: 0 }; // Direção desejada
    this.fishSpeed = 0.0006; // Velocidade base mais lenta
    this.directionChangeTime = 0; // Timer para mudança de direção
    this.directionChangeCooldown = 3000 + Math.random() * 4000; // 3-7 segundos entre mudanças (mais lento)
    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.originalFishMovement = { moveX: 0, moveY: 0 };
    this.exclamationTime = 0;
    this.exclamationStartTime = 0;
    this.canClickExclamation = false;
    this.onGameStart = null;
    this.onExclamationClick = null;
    this.fishTimeOffset = 0;
    this.transitionBackToNaturalTime = 0;
    this.transitionBackToNaturalDuration = 2000;
    this.transitionStartPosition = { x: 0.5, y: 0.65 };

    // Novos estados para melhorias
    this.showFisgadoText = false;
    this.fisgadoTextStartTime = 0;
    this.isVibrating = false;

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
      uniform float u_fishDirection; // 1.0 = direita, -1.0 = esquerda
      
            // Uniforms para área da água modular
      uniform vec4 u_waterArea; // x, y, width, height (0-1)
      uniform float u_waterShape; // 0=rectangle, 1=circle, 2=triangle
      
      uniform sampler2D u_backgroundTexture;
      uniform sampler2D u_noiseTexture;
      uniform sampler2D u_fishTexture;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;

      // Função de ru��do simplex 2D (mantida original)
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

      // Fun��ão para calcular a refração (mantida original)
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

      // Fun����ão para obter cor com peixe (mantida original)
            vec4 getColorWithFish(vec2 coords, float fishX, float fishY, float fishAngle) {
        vec4 bgColor = texture2D(u_backgroundTexture, coords);
        
        vec2 fishPos = vec2(fishX, fishY);
        vec2 fishSize = vec2(0.08, 0.06);

                                                                                // SISTEMA ULTRA SIMPLES: Flip horizontal apenas quando necessário
        vec2 localUV = (coords - fishPos + fishSize * 0.5) / fishSize;

                // Lógica de orientação simplificada
        vec2 fishUV = localUV;

                                        // Lógica original do shader: não mexer
        // fishAngle = 0 (direita), fishAngle = PI (esquerda)
        if (fishAngle > 1.5) {
            fishUV.x = 1.0 - fishUV.x; // Flip quando fishAngle = PI (esquerda)
        }
        // fishAngle = 0 (direita): usar imagem normal
        // Y sempre inalterado - nunca inverte verticalmente

                                                        // === RENDERIZAR SOMBRA SUAVE E DISPERSA DO PEIXE ===

        // Offset da sombra (ligeiramente para baixo e direita)
        vec2 shadowOffset = vec2(0.008, 0.015);

        // Criar múltiplas sombras dispersas para efeito suave
        float totalShadowAlpha = 0.0;
        vec3 totalShadowColor = vec3(0.0);

        // 4 sombras ligeiramente deslocadas para criar dispersão
        for(int i = 0; i < 4; i++) {
            float angle = float(i) * 1.57; // 90 graus entre cada sombra
            vec2 disperseOffset = vec2(cos(angle), sin(angle)) * 0.003; // Dispersão mínima

            vec2 shadowPos = fishPos + shadowOffset + disperseOffset;
            vec2 shadowUV = (coords - shadowPos + fishSize * 0.5) / fishSize;

            // Aplicar orientação à sombra
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

        // Movimento de "busca" rápido (caracter��stico do Evo Fish)
        float searchX = sin(t * 2.2) * areaW * 0.1;
        float searchY = cos(t * 1.8) * areaH * 0.08;

        // Acelerações s��bitas (como quando peixes vêem comida)
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

          // Movimento suave em direção ao anzol
          float targetX = u_hookPosition.x;
          float targetY = u_hookPosition.y;

          naturalFishX = mix(naturalFishX, targetX, attractionStrength);
          naturalFishY = mix(naturalFishY, targetY, attractionStrength);
        }

        // Pequena variação orgânica sutil
        naturalFishX += sin(time * 0.006) * areaW * 0.008;
        naturalFishY += cos(time * 0.004) * areaH * 0.006;

                // === DELIMITAÇÃO DA ÁREA - EXATAMENTE NA LINHA TRACEJADA ===

        // Manter dentro da ��rea exatamente na linha tracejada
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
        if (u_fishDirection > 0.0) {
            fishAngle = 3.14159; // Direita (PI para flip correto)
        } else {
            fishAngle = 0.0; // Esquerda (0 para sem flip)
        }

                        // Usar posição calculada pelo JavaScript
        float fishX = u_fishTargetPosition.x;
        float fishY = u_fishTargetPosition.y;
        
                                // Imagem original com peixe
        vec4 originalColor = getColorWithFish(uv, fishX, fishY, fishAngle);
        
        // Verificar se está na área da água
        bool inWater = isInWaterArea(uv);
        float waterMask = inWater ? 1.0 : 0.0;
        
        if (inWater) {
          // Aplicar efeitos de água apenas dentro da ��rea
          vec2 refraction = calculateRefraction(uv, u_time) * waterMask;
          vec2 distortedUV = uv + refraction;
          
                                        vec4 backgroundColor = getColorWithFish(distortedUV, fishX, fishY, fishAngle);
          
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
        
                                // Adicionar exclamação moderna e bonita se necessário
        if (u_showExclamation > 0.0 && u_gameState >= 4.0) {
          // Vibração quando fisgado - mesma que o peixe
          vec2 vibrationOffset = vec2(0.0, 0.0);
          if (u_gameState >= 4.0) {
            float vibrationIntensity = 0.003;
            vibrationOffset.x = sin(u_time * 50.0) * vibrationIntensity;
            vibrationOffset.y = cos(u_time * 47.0) * vibrationIntensity;
          }

          // Posição da exclamação (ligeiramente acima do peixe, mas seguindo vibração)
          vec2 exclamationPos = vec2(fishX + vibrationOffset.x, fishY + vibrationOffset.y - 0.04);

          // Pulsação suave para chamar atenção
          float pulse = 0.9 + 0.1 * sin(u_time * 8.0);

          // Desenhar "!" moderno e bonito
          vec2 localUV = (uv - exclamationPos) * 80.0; // Escala menor para ficar mais delicado

          // Sombra sutil do "!"
          vec2 shadowUV = localUV + vec2(1.5, 1.5);
          if (abs(shadowUV.x) < 1.2 && shadowUV.y > -3.5 && shadowUV.y < 2.5) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.0, 0.0), 0.15);
          }
          if (abs(shadowUV.x) < 1.2 && shadowUV.y > 3.5 && shadowUV.y < 5.0) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.0, 0.0), 0.15);
          }

          // Corpo principal do "!" com gradiente dourado
          if (abs(localUV.x) < 1.0 && localUV.y > -3.0 && localUV.y < 2.0) {
            float gradient = (localUV.y + 3.0) / 5.0;
            vec3 goldColor = mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 1.0, 0.4), gradient);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, goldColor * pulse, 1.0);
          }

          // Ponto do "!"
          if (abs(localUV.x) < 1.0 && localUV.y > 3.0 && localUV.y < 4.5) {
            vec3 goldColor = vec3(1.0, 0.9, 0.2);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, goldColor * pulse, 1.0);
          }

          // Brilho/glow ao redor
          float dist = length(localUV);
          if (dist < 8.0 && dist > 6.0) {
            float glowIntensity = 1.0 - (dist - 6.0) / 2.0;
            vec3 glowColor = vec3(1.0, 1.0, 0.6);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, glowColor, glowIntensity * 0.2 * pulse);
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

    // Novos uniforms para área modular
    this.uniforms.waterArea = this.gl.getUniformLocation(
      this.program,
      "u_waterArea",
    );
    this.uniforms.waterShape = this.gl.getUniformLocation(
      this.program,
      "u_waterShape",
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
      "https://cdn.builder.io/api/v1/image/assets%2Fae8512d3d0df4d1f8f1504a06406c6ba%2F62141810443b4226b05ad6c4f3dcd94e?format=webp&width=800";
  }

  // Atualizar área da água
  updateWaterArea(waterArea) {
    this.waterArea = waterArea;
  }

  // Métodos do jogo de pesca (mantidos originais mas simplificados)
  startFishingGame(hookX, hookY) {
    console.log("Starting fishing game at", hookX, hookY);
    this.gameState = "hook_cast";
    this.hookPosition = { x: hookX, y: hookY };
    this.canClickExclamation = false;
    this.fishReactionDelay = 4000 + Math.random() * 8000;
    this.fishReactionStartTime = Date.now();
  }

  // Método para movimento orgânico - evitar bordas naturalmente
  avoidBorders() {
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

      // Resetar timer para evitar mudan��as muito frequentes
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
      // Gerar nova direção favorecendo movimento horizontal
      let angle;

      if (Math.random() < 0.7) {
        // 70% chance de movimento mais horizontal (-45° a 45° ou 135�� a 225°)
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
    if (this.gameState === "idle" || this.gameState === "hook_cast") {
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
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      // === MOVIMENTO EM DIREÇÃO AO ANZOL ===
      const dx = this.hookPosition.x - this.fishCurrentPosition.x;
      const dy = this.hookPosition.y - this.fishCurrentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const moveSpeed = 0.001; // Velocidade moderada
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

    // Atualizar posição
    if (this.gameState !== "fish_hooked") {
      this.fishCurrentPosition.x += this.fishVelocity.x;
      this.fishCurrentPosition.y += this.fishVelocity.y;

      // Forçar peixe a ficar exatamente dentro da linha tracejada
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

    // Calcular direção do peixe baseada na velocidade
    if (Math.abs(this.fishVelocity.x) > 0.0001) {
      this.fishDirection = this.fishVelocity.x > 0 ? 1 : -1;
    }

    // Log de debug ocasional
    if (Math.random() < 0.005) {
      console.log(
        `🐟 ORGANIC - Pos: (${this.fishCurrentPosition.x.toFixed(3)}, ${this.fishCurrentPosition.y.toFixed(3)}), Vel: (${this.fishVelocity.x.toFixed(4)}, ${this.fishVelocity.y.toFixed(4)}), Dir: ${this.fishDirection > 0 ? "RIGHT" : "LEFT"}`,
      );
    }
  }

  // Método para lidar com clique na exclama��ão
  handleExclamationClick() {
    if (this.gameState === "fish_hooked" && this.canClickExclamation) {
      console.log("Player clicked exclamation! Showing Fisgado text.");
      this.canClickExclamation = false;
      this.exclamationTime = 0;

      // Mostrar texto "Fisgado!" por 0.6 segundos
      this.showFisgadoText = true;
      this.fisgadoTextStartTime = Date.now();

      // Após 0.6s, abrir minigame
      setTimeout(() => {
        this.showFisgadoText = false;
        if (this.onGameStart) {
          this.onGameStart();
        }
      }, 600);

      return true;
    }
    return false;
  }

  updateFishingGame() {
    // Atualizar posição do peixe a cada frame
    this.updateFishPosition();

    if (this.gameState === "hook_cast") {
      const elapsedTime = Date.now() - this.fishReactionStartTime;
      if (elapsedTime >= this.fishReactionDelay) {
        // Capturar posição atual e começar reação
        this.gameState = "fish_reacting";
        console.log(
          `🎣 Fish reacting! Current position: (${this.fishCurrentPosition.x.toFixed(3)}, ${this.fishCurrentPosition.y.toFixed(3)})`,
        );

        // Come��ar movimento ap��s breve pausa
        setTimeout(() => {
          if (this.gameState === "fish_reacting") {
            this.gameState = "fish_moving";
          }
        }, 500);
      }
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      // Verificar se chegou próximo ao anzol
      const distance = Math.sqrt(
        Math.pow(this.fishCurrentPosition.x - this.hookPosition.x, 2) +
          Math.pow(this.fishCurrentPosition.y - this.hookPosition.y, 2),
      );

      if (distance < 0.03) {
        // Chegou próximo ao anzol
        this.gameState = "fish_hooked";
        this.exclamationTime = 1000;
        this.exclamationStartTime = Date.now();
        this.canClickExclamation = true;
        this.isVibrating = true;
        console.log(
          "🎣 Fish hooked! Starting exclamation timer and vibration.",
        );

        // Timer automático será gerenciado no updateFishingGame()
      }
    } else if (this.gameState === "fish_hooked") {
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

    // Voltar ao estado idle para permitir novo interesse no anzol
    this.gameState = "idle";
    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.exclamationTime = 0;
    this.isVibrating = false;
    this.showFisgadoText = false;
    this.canClickExclamation = false;

    // Manter a posição do anzol para o peixe poder se interessar novamente
    // this.hookPosition = { x: 0.5, y: 0.5 }; // Comentado para manter anzol ativo
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

  // Método para desenhar overlay da boca do peixe
  drawFishMouthOverlay() {
    const overlayCanvas = document.getElementById("fishMouthOverlay");
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    // Ajustar tamanho do overlay
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;

    // Limpar canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Usar a MESMA posição do peixe que o shader usa
    const fishUvX = this.fishCurrentPosition.x;
    const fishUvY = this.fishCurrentPosition.y;

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
    if (this.fishDirection > 0) {
      mouthOffsetX = fishSizePixelX / 2 - 10; // Boca à direita - 10px mais próximo da ponta
    } else {
      mouthOffsetX = -(fishSizePixelX / 2) + 10; // Boca à esquerda + 10px mais próximo da ponta
    }

    const mouthX =
      fishPixelX + mouthOffsetX + (this.fishDirection > 0 ? -7 : 7); // -7px para direita ou +7px para esquerda (mais 4px próximo da boca)
    const mouthY = fishPixelY + 2; // +2px para baixo

    // Desenhar CÍRCULO ROSA MUITO PEQUENO na posição da boca
    ctx.fillStyle = "rgba(255, 0, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, 2, 0, 2 * Math.PI); // Diminuído para 2px
    ctx.fill();

    // Borda do círculo
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Texto indicativo
    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.fillText("BOCA", mouthX - 20, mouthY - 40);

    // Desenhar texto "Fisgado!" se necessário
    if (this.showFisgadoText) {
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

    // Define uniforms b��sicos
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

    // Log apenas quando muda de estado
    if (this.gameState === "fish_hooked" && Math.random() < 0.02) {
      console.log(
        `🔔 EXCLAMATION - Time remaining: ${this.exclamationTime}ms, showing: ${showExclamationValue > 0}`,
      );
    }

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

    // Novos uniforms para área modular
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

  const barSize = 20; // Tamanho da barra em %
  const fishSize = 8; // Tamanho do peixe em %

  useEffect(() => {
    const gameInterval = setInterval(() => {
      // Movimento aleatório do peixe
      setFishPosition((prev) => {
        const change = (Math.random() - 0.5) * 8;
        return Math.max(
          fishSize / 2,
          Math.min(100 - fishSize / 2, prev + change),
        );
      });

      // Movimento da barra (cai por gravidade ou sobe se pressionado)
      setBarPosition((prev) => {
        let newPos = prev;
        if (isHolding) {
          newPos = Math.max(0, prev - 3); // Sobe
        } else {
          newPos = Math.min(100, prev + 2); // Desce por gravidade
        }
        return newPos;
      });

      // Verificar se o peixe está na barra
      setProgress((prev) => {
        const fishInBar =
          Math.abs(fishPosition - barPosition) < (barSize + fishSize) / 2;
        if (fishInBar) {
          return Math.min(100, prev + 2); // Progresso aumenta
        } else {
          return Math.max(0, prev - 1); // Progresso diminui
        }
      });

      // Diminuir tempo
      setGameTime((prev) => {
        const newTime = prev - 50;
        if (newTime <= 0) {
          onComplete(false); // Tempo esgotado
        }
        return newTime;
      });
    }, 50);

    return () => clearInterval(gameInterval);
  }, [fishPosition, barPosition, isHolding, onComplete]);

  useEffect(() => {
    if (progress >= 100) {
      onComplete(true); // Sucesso!
    }
  }, [progress, onComplete]);

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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          width: "300px",
          height: "400px",
          position: "relative",
        }}
      >
        <h3 style={{ textAlign: "center", margin: "0 0 20px 0" }}>
          Minigame de Pesca
        </h3>

        {/* Barra de progresso */}
        <div
          style={{
            width: "100%",
            height: "20px",
            backgroundColor: "#ddd",
            borderRadius: "10px",
            marginBottom: "20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: progress > 50 ? "#4CAF50" : "#FF9800",
              transition: "width 0.1s",
            }}
          />
        </div>

        {/* Timer */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          Tempo: {Math.ceil(gameTime / 1000)}s
        </div>

        {/* Área do jogo */}
        <div
          style={{
            width: "60px",
            height: "250px",
            backgroundColor: "#87CEEB",
            border: "3px solid #4682B4",
            borderRadius: "8px",
            margin: "0 auto",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Peixe */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: `${fishPosition}%`,
              transform: "translateX(-50%) translateY(-50%)",
              width: "40px",
              height: "20px",
              backgroundColor: "#FF6B35",
              borderRadius: "10px",
              border: "2px solid #D84315",
            }}
          >
            🐟
          </div>

          {/* Barra do jogador */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: `${barPosition}%`,
              transform: "translateX(-50%) translateY(-50%)",
              width: "50px",
              height: `${barSize}%`,
              backgroundColor: isHolding ? "#4CAF50" : "#8BC34A",
              border: "2px solid #388E3C",
              borderRadius: "5px",
            }}
          />
        </div>

        <div
          style={{ textAlign: "center", marginTop: "20px", fontSize: "14px" }}
        >
          Segure ESPAÇO ou clique para subir a barra verde.
          <br />
          Mantenha o peixe na barra!
        </div>
      </div>
    </div>
  );
};

export const FishingScreenModular: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
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
  const [showFishingModal, setShowFishingModal] = useState(false);
  const [showMinigame, setShowMinigame] = useState(false);
  const [fishingSettings, setFishingSettings] =
    useState<FishingSettings | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [editMode, setEditMode] = useState(false); // Modo de edição da área da água
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const isAdmin = user?.isAdmin || false;

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
    const timer = setTimeout(() => {
      try {
        const waterEffect = new ModularWaterEffect(waterArea);
        waterEffect.onGameStart = () => {
          setShowMinigame(true);
        };

        // Adicionar listener para cliques na exclamação
        const handleCanvasClick = (e: MouseEvent) => {
          if (
            waterEffect.gameState === "fish_hooked" &&
            waterEffect.canClickExclamation
          ) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;

            // Posição da exclamação (acima do peixe)
            // Usar posição natural do peixe baseada no tempo
            const time = waterEffect.fishTime * 0.5;
            const areaX = waterEffect.waterArea.x;
            const areaY = waterEffect.waterArea.y;
            const areaW = waterEffect.waterArea.width;
            const areaH = waterEffect.waterArea.height;

            // Calcular posição do peixe (baseado no shader)
            const centerX = areaX + areaW / 2;
            const centerY = areaY + areaH / 2;
            const mainRadius = Math.min(areaW, areaH) * 0.35;
            const mainAngle = time * 0.8;
            const circleX = Math.cos(mainAngle) * mainRadius;
            const circleY = Math.sin(mainAngle) * mainRadius * 0.7;

            const fishX = centerX + circleX * 0.01; // Conversão aproximada para coordenadas UV
            const fishY = centerY + circleY * 0.01;
            const exclamationX = fishX;
            const exclamationY = fishY - 0.08;

            // Verificar se clicou na área da exclamação
            const distance = Math.sqrt(
              Math.pow(x - exclamationX, 2) + Math.pow(y - exclamationY, 2),
            );

            if (distance <= 0.05) {
              // Área clic��vel da exclamação
              waterEffect.handleExclamationClick();
            }
          }
        };

        const canvas = document.getElementById("waterCanvas");
        if (canvas) {
          canvas.addEventListener("click", handleCanvasClick);
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

        waterEffectRef.current = waterEffect;
      } catch (error) {
        console.error("Error initializing ModularWaterEffect:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
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
        // Implementação básica de triângulo
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
          if (waterEffectRef.current) {
            waterEffectRef.current.resetFishingGame();
          }
        }}
      />

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
            💡 <strong>Reposicionar área:</strong> Segure{" "}
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
            �� <strong>Redimensionar:</strong> Use os sliders abaixo
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
              Distorç��o:{" "}
              {(fishingSettings?.distortionAmount || 0.3).toFixed(2)}
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
                �� Imagem personalizada ativa
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
              : "��️ Segure Shift e arraste a área tracejada para reposicionar"}
          </div>
        </div>
      )}

      {/* Minigame de Pesca estilo Stardew Valley */}
      {showMinigame && (
        <FishingMinigame
          onComplete={(success) => {
            setShowMinigame(false);
            if (success) {
              setShowFishingModal(true);
            }
            if (waterEffectRef.current) {
              waterEffectRef.current.resetFishingGame();
            }
          }}
        />
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
              �� Peixe Fisgado!
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
