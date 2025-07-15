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
  y: number; // Posição Y relativa (0-1)
  width: number; // Largura relativa (0-1)
  height: number; // Altura relativa (0-1)
  shape: "rectangle" | "circle" | "triangle";
}

// WebGL Water Effect Class Modular - NOVO: Movimento aleatório livre com rotação 360° baseado na área definida
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
    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.originalFishMovement = { moveX: 0, moveY: 0 };
    this.exclamationTime = 0;
    this.onGameStart = null;
    this.fishTimeOffset = 0;
    this.transitionBackToNaturalTime = 0;
    this.transitionBackToNaturalDuration = 2000;
    this.transitionStartPosition = { x: 0.5, y: 0.65 };

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
            vec4 getColorWithFish(vec2 coords, float fishX, float fishY, float fishAngle) {
        vec4 bgColor = texture2D(u_backgroundTexture, coords);
        
        vec2 fishPos = vec2(fishX, fishY);
        vec2 fishSize = vec2(0.08, 0.06);

                                                                                // SISTEMA ULTRA SIMPLES: Flip horizontal apenas quando necessário
        vec2 localUV = (coords - fishPos + fishSize * 0.5) / fishSize;

                // Lógica de orientação simplificada
        vec2 fishUV = localUV;

        // Se fishAngle > 1.5 (aproximadamente PI), peixe está voltado para esquerda
        if (fishAngle > 1.5) {
            fishUV.x = 1.0 - fishUV.x; // Flip horizontal simples
        }
        // Caso contrário, orientação normal (direita)
        // Y sempre inalterado - nunca inverte verticalmente

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

        // === MOVIMENTO BASE: TRAJETÓRIA ORGÂNICA ===

        float moveSpeed = 0.03; // Velocidade base muito suave

        // Trajetória principal: Lemniscata (símbolo do infinito) suave
        float mainPhase = time * moveSpeed;

        // Parâmetros da lemniscata
        float a = min(areaW, areaH) * 0.25; // Raio baseado na menor dimensão

        float cosPhase = cos(mainPhase);
        float sinPhase = sin(mainPhase);
        float denominator = 1.0 + sinPhase * sinPhase;

        // Coordenadas da lemniscata
        float lemnX = a * cosPhase / denominator;
        float lemnY = a * sinPhase * cosPhase / denominator;

        // Posição base
        float baseX = centerX + lemnX;
        float baseY = centerY + lemnY;

        // === MODIFICAÇÕES POR ESTADO ===

        float naturalFishX = baseX;
        float naturalFishY = baseY;

                // === MOVIMENTO SIMPLIFICADO - SEM OSCILAÇÕES EXCESSIVAS ===

        // Apenas um movimento suave adicional baseado no estado
        if (fishBehavior < 0.5) { // NADANDO LIVRE
            // Movimento suave e controlado
            float explorePhase = time * 0.015; // Muito mais lento
            naturalFishX += sin(explorePhase) * areaW * 0.03; // Amplitude reduzida
            naturalFishY += cos(explorePhase * 0.7) * areaH * 0.02;

        } else if (fishBehavior < 1.5) { // EXPLORANDO
            // Movimento muito sutil
            float searchPhase = time * 0.008;
            naturalFishX += sin(searchPhase) * areaW * 0.015;
            naturalFishY += cos(searchPhase * 0.8) * areaH * 0.01;

        } else { // DESCANSANDO
            // Praticamente estático
            float restPhase = time * 0.003;
            naturalFishX += sin(restPhase) * areaW * 0.005;
            naturalFishY += cos(restPhase) * areaH * 0.003;
        }

        // NENHUM movimento corporal adicional - eliminar tudo que causa wiggle

        // === DELIMITAÇÃO DA ÁREA ===

        // Manter dentro da área com margens suaves
        float margin = 0.1;
        naturalFishX = clamp(naturalFishX, areaX + areaW * margin, areaX + areaW * (1.0 - margin));
        naturalFishY = clamp(naturalFishY, areaY + areaH * margin, areaY + areaH * (1.0 - margin));

        // === SISTEMA DE ROTAÇÃO NATURAL ===

                        // === ORIENTAÇÃO BASEADA NA DIREÇÃO REAL DO MOVIMENTO ===

        // Calcular direção baseada na trajetória da lemniscata
        float currentPhase = time * moveSpeed;
        float futurePhase = (time + 1.0) * moveSpeed; // Olhar 1 segundo à frente

        // Posição atual e futura na lemniscata
        float currentCos = cos(currentPhase);
        float currentSin = sin(currentPhase);
        float currentDenom = 1.0 + currentSin * currentSin;
        float currentX = centerX + a * currentCos / currentDenom;

        float futureCos = cos(futurePhase);
        float futureSin = sin(futurePhase);
        float futureDenom = 1.0 + futureSin * futureSin;
        float futureX = centerX + a * futureCos / futureDenom;

        // Determinar direção com base no movimento da trajetória
        float direction = futureX - currentX;

        float fishAngle = 0.0;

        // Usar limiar maior para evitar oscilações
        if (direction > 0.015) {
            fishAngle = 0.0; // Direita
        } else if (direction < -0.015) {
            fishAngle = 3.14159; // Esquerda
        }
        // Entre -0.015 e 0.015: mantém orientação anterior

        float fishX, fishY;
        if (u_gameState >= 2.0) {
          fishX = u_fishTargetPosition.x;
          fishY = u_fishTargetPosition.y;
        } else if (u_transitionSmoothing > 0.0) {
          float progress = 1.0 - u_transitionSmoothing;
          float easeProgress = 1.0 - pow(1.0 - progress, 3.0);
          fishX = mix(u_transitionStartPosition.x, naturalFishX, easeProgress);
          fishY = mix(u_transitionStartPosition.y, naturalFishY, easeProgress);
        } else {
          fishX = naturalFishX;
          fishY = naturalFishY;
        }
        
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
        
        // Adicionar exclamação se necessário
        if (u_showExclamation > 0.0 && u_gameState >= 4.0) {
          vec2 exclamationPos = vec2(fishX, fishY - 0.08);
          float distToExclamation = distance(uv, exclamationPos);

          if (distToExclamation < 0.02) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 1.0, 0.0), 0.8);
          }

          vec2 localUV = (uv - exclamationPos) / 0.02;
          if (abs(localUV.x) < 0.2 && localUV.y > -0.5 && localUV.y < 0.2) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.0, 0.0), 0.9);
          }
          if (abs(localUV.x) < 0.2 && localUV.y > 0.4 && localUV.y < 0.7) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.0, 0.0), 0.9);
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
    this.fishReactionDelay = 4000 + Math.random() * 8000;
    this.fishReactionStartTime = Date.now();
  }

  updateFishingGame() {
    if (this.gameState === "hook_cast") {
      const elapsedTime = Date.now() - this.fishReactionStartTime;
      if (elapsedTime >= this.fishReactionDelay) {
        // Usar sistema de movimento aleatório independente
        const time = this.fishTime * 0.5; // Velocidade independente e constante

        // Parâmetros da área da água
        const areaX = this.waterArea.x;
        const areaY = this.waterArea.y;
        const areaW = this.waterArea.width;
        const areaH = this.waterArea.height;

        // Área interior com margens
        const margin = 0.05;
        const innerX = areaX + areaW * margin;
        const innerY = areaY + areaH * margin;
        const innerW = areaW * (1.0 - margin * 2.0);
        const innerH = areaH * (1.0 - margin * 2.0);

        // Ruído base para direção geral
        const noiseX1 =
          Math.sin(time * 0.7 + 123.45) * Math.cos(time * 0.5 + 67.89);
        const noiseY1 =
          Math.cos(time * 0.6 + 234.56) * Math.sin(time * 0.8 + 78.9);

        // Ruído de alta frequência
        const noiseX2 = Math.sin(time * 2.3 + 345.67) * 0.3;
        const noiseY2 = Math.cos(time * 1.9 + 456.78) * 0.3;

        // Ruído de baixa frequência
        const noiseX3 = Math.sin(time * 0.2 + 567.89) * 0.8;
        const noiseY3 = Math.cos(time * 0.15 + 678.9) * 0.8;

        // Combinar ruídos
        const moveX = (noiseX1 + noiseX2 + noiseX3) / 3.0;
        const moveY = (noiseY1 + noiseY2 + noiseY3) / 3.0;

        // Posição dentro da área interior
        const currentFishX = innerX + innerW * 0.5 + moveX * innerW * 0.4;
        const currentFishY = innerY + innerH * 0.5 + moveY * innerH * 0.4;

        this.fishTargetPosition = { x: currentFishX, y: currentFishY };
        this.gameState = "fish_reacting";
      }
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      const speed = 0.0002; // Velocidade razoável para movimento visível
      const dx = this.hookPosition.x - this.fishTargetPosition.x;
      const dy = this.hookPosition.y - this.fishTargetPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.01) {
        this.gameState = "fish_moving";
        this.fishTargetPosition.x += (dx / distance) * speed;
        this.fishTargetPosition.y += (dy / distance) * speed;
      } else {
        this.gameState = "fish_hooked";
        this.exclamationTime = 1000;
        setTimeout(() => {
          if (this.onGameStart) {
            this.onGameStart();
          }
        }, 1000);
      }
    } else if (this.gameState === "fish_hooked") {
      if (this.exclamationTime > 0) {
        this.exclamationTime -= 16;
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

    this.gameState = "idle";
    this.hookPosition = { x: 0.5, y: 0.5 };
    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.exclamationTime = 0;
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
      this.fishTargetPosition.x,
      this.fishTargetPosition.y,
    );
    this.gl.uniform1f(
      this.uniforms.showExclamation,
      this.gameState === "fish_hooked" && this.exclamationTime > 0 ? 1.0 : 0.0,
    );
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

    requestAnimationFrame(() => this.render());
  }
}

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
          setShowFishingModal(true);
        };

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
        onHookCast={(x, y) => {
          const uvX = x / window.innerWidth;
          const uvY = y / window.innerHeight;

          if (waterEffectRef.current && isPointInWaterArea(x, y)) {
            waterEffectRef.current.startFishingGame(uvX, uvY);
          }
        }}
        onLineReeled={() => {
          if (waterEffectRef.current) {
            waterEffectRef.current.resetFishingGame();
          }
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
                ✓ Imagem personalizada ativa
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
