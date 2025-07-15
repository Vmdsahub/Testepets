import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import {
  fishingSettingsService,
  FishingSettings,
} from "../../services/fishingSettingsService";
import { FishingRod } from "../Game/FishingRod";

// WebGL Water Effect Class - With 60% coverage mask
class WaterEffect {
  constructor() {
    this.canvas = document.getElementById("waterCanvas");

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

    // Sistema de Steering Behaviors para movimento orgânico
    this.fishPosition = { x: 0.5, y: 0.7 }; // Posição atual
    this.fishVelocity = { x: 0, y: 0 }; // Velocidade atual
    this.fishAcceleration = { x: 0, y: 0 }; // Aceleração
    this.wanderTarget = { x: 0.6, y: 0.8 }; // Alvo de wandering
    this.wanderAngle = 0; // Ângulo para wandering
    this.maxSpeed = 0.0002; // Velocidade máxima (reduzida de 0.0008 para 0.0002)
    this.maxForce = 0.00003; // Força máxima de steering (reduzida para movimento mais suave)
    this.wanderRadius = 0.08; // Raio do círculo de wandering (menor para curvas mais suaves)
    this.wanderDistance = 0.05; // Distância do círculo de wandering (menor)
    this.wanderJitter = 0.15; // Variação no wandering (ainda mais reduzida para menos oscilação)

    // Estados do jogo de pesca
    this.gameState = "idle"; // 'idle', 'hook_cast', 'fish_reacting', 'fish_moving', 'fish_hooked'
    this.hookPosition = { x: 0.5, y: 0.5 };
    this.fishTargetPosition = { x: 0.5, y: 0.65 };
    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.originalFishMovement = { moveX: 0, moveY: 0 };
    this.exclamationTime = 0;
    this.exclamationStartTime = 0;
    this.canClickExclamation = false;
    this.onGameStart = null; // Callback para abrir modal
    this.onExclamationClick = null; // Callback para clique na exclamação
    this.fishTimeOffset = 0; // Offset para sincronizar movimento natural com posição atual
    this.transitionBackToNaturalTime = 0; // Tempo desde que voltou para movimento natural
    this.transitionBackToNaturalDuration = 2000; // 2 segundos para suavizar retorno (debug)
    this.transitionStartPosition = { x: 0.5, y: 0.65 }; // Posição onde o peixe estava quando iniciou a transição

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
                                    uniform float u_gameState; // 0=idle, 1=hook_cast, 2=fish_reacting, 3=fish_moving, 4=fish_hooked
            uniform vec2 u_hookPosition;
            uniform vec2 u_fishTargetPosition;
                        uniform float u_showExclamation;
                        uniform float u_fishTimeOffset;
                        uniform float u_transitionSmoothing; // 0.0 = movimento completo, 1.0 = movimento reduzido
            uniform vec2 u_transitionStartPosition; // Posição onde o peixe estava quando iniciou a transição
            uniform vec2 u_fishPosition; // Posição atual calculada pelo steering system
            uniform vec2 u_fishVelocity; // Velocidade atual para rotação
                        uniform sampler2D u_backgroundTexture;
            uniform sampler2D u_noiseTexture;
            uniform sampler2D u_fishTexture;
            
            varying vec2 v_texCoord;
            varying vec2 v_position;

            // Função de ruído simplex 2D
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

            // Função para criar ondas realistas
            float createWaves(vec2 uv, float time) {
                // Ondas balanceadas em múltiplas direções
                float wave1 = sin(uv.x * 6.0 + time * 1.5) * 0.1;
                float wave2 = sin(uv.y * 8.0 + time * 2.0) * 0.08;
                float wave3 = sin((uv.x + uv.y) * 12.0 + time * 1.2) * 0.05;
                float wave4 = sin((uv.x - uv.y) * 10.0 + time * 1.8) * 0.06;
                
                // Ondas circulares para movimento mais natural
                float dist = length(uv - 0.5);
                float wave5 = sin(dist * 20.0 - time * 3.0) * 0.04;
                
                // Ruído em direções opostas para balanceamento
                float noise1 = snoise(uv * 10.0 + time * 0.5) * 0.03;
                float noise2 = snoise(uv * 15.0 - time * 0.3) * 0.02;
                float noise3 = snoise(uv.yx * 12.0 + time * 0.7) * 0.025;
                
                return (wave1 + wave2 + wave3 + wave4 + wave5 + noise1 + noise2 + noise3) * u_waveIntensity;
            }

            // Função para calcular a refração
            vec2 calculateRefraction(vec2 uv, float time) {
                float waveHeight = createWaves(uv, time);
                
                // Calcula o gradiente das ondas para a normal da superfície
                vec2 epsilon = vec2(0.01, 0.0);
                float heightRight = createWaves(uv + epsilon.xy, time);
                float heightUp = createWaves(uv + epsilon.yx, time);
                
                vec2 gradient = vec2(heightRight - waveHeight, heightUp - waveHeight) / epsilon.x;
                
                // Aplica distorç��o baseada no gradiente
                return gradient * u_distortionAmount;
            }

            // Simulação de cáusticas (padrões de luz na água)
            float calculateCaustics(vec2 uv, float time) {
                vec2 causticsUV = uv * 15.0;
                
                float caustic1 = abs(sin(causticsUV.x + time * 2.0));
                float caustic2 = abs(sin(causticsUV.y + time * 1.5));
                float caustic3 = abs(sin((causticsUV.x + causticsUV.y) * 0.5 + time));
                
                // Adiciona ruído para variação
                float noise = snoise(causticsUV + time * 0.3);
                
                return pow(caustic1 * caustic2 * caustic3 + noise * 0.2, 2.0) * 0.3;
            }

                                                // Função para obter cor com peixe
            vec4 getColorWithFish(vec2 coords, float fishX, float fishY) {
                vec4 bgColor = texture2D(u_backgroundTexture, coords);

                                

                                vec2 fishPos = vec2(fishX, fishY);
                vec2 fishSize = vec2(0.08, 0.06); // Diminuído de 0.15x0.12 para 0.08x0.06

                                                                                                                                                                                                                                                // ROTAÇÃO BASEADA NA VELOCIDADE DO STEERING SYSTEM

                // Usar velocidade calculada pelo sistema de steering behaviors
                float velocityX = u_fishVelocity.x;
                float velocityY = u_fishVelocity.y;

                                                // Determinar orientação baseada na velocidade horizontal
                // Limiar mais alto para reduzir oscilações (aumentado de 0.0001 para 0.0008)
                bool facingRight = velocityX > 0.0008;

                // Calcula UV do peixe garantindo orientação sempre correta
                vec2 localUV = (coords - fishPos + fishSize * 0.5) / fishSize;
                vec2 fishUV;

                // CORREÇÃO: Inverter lógica para orientação correta
                // Peixe deve olhar na direção que está nadando
                if (facingRight) {
                    // Orientação normal quando nada para direita
                    fishUV = vec2(localUV.x, localUV.y);
                } else {
                    // Flip horizontal quando nada para esquerda
                    fishUV = vec2(1.0 - localUV.x, localUV.y);
                }

                // Clamp UV para evitar problemas de renderização
                fishUV = clamp(fishUV, 0.0, 1.0);

                // Verifica se est�� na área do peixe e na área da água
                if (fishUV.x >= 0.0 && fishUV.x <= 1.0 && fishUV.y >= 0.0 && fishUV.y <= 1.0 && coords.y > 0.4) {
                    vec4 fishColor = texture2D(u_fishTexture, fishUV);
                    if (fishColor.a > 0.1) {
                        bgColor = mix(bgColor, vec4(fishColor.rgb, 1.0), fishColor.a);
                    }
                }

                return bgColor;
            }

            void main() {
                vec2 uv = v_texCoord;
                vec2 screenUV = gl_FragCoord.xy / u_resolution;
                
                                // Calcular posição do peixe baseada no estado do jogo
                float fishX, fishY;

                                                                                                                                                                                                                                                                                                                                                // SISTEMA DE STEERING BEHAVIORS - MOVIMENTO ORGÂNICO
                // Este movimento será calculado no JavaScript e passado para o shader
                // O shader apenas interpola entre as posições calculadas pelo sistema de steering

                // Posição natural será sobrescrita pelo sistema JavaScript
                float naturalFishX = 0.5;
                float naturalFishY = 0.7;

                // O movimento real é calculado no sistema de steering behaviors em JavaScript

                                                // Sempre usar posição do sistema de steering behaviors para movimento suave
                fishX = u_fishPosition.x;
                fishY = u_fishPosition.y;

                // Cria máscara de água (60% da tela de baixo para cima)
                                float waterLine = 0.4; // Linha da água aos 40% (deixando 60% de baixo com efeito)
                float transitionWidth = 0.15; // Largura da transição suave
                
                // Calcula posição vertical (0.0 = topo, 1.0 = fundo)
                                float verticalPos = uv.y;
                
                // Cria transição suave com ondulação natural na linha da água
                float waveOffset = sin(uv.x * 10.0 + u_time * 0.5) * 0.03 + 
                                  sin(uv.x * 5.0 - u_time * 0.3) * 0.02 +
                                  sin(uv.x * 15.0 + u_time * 0.8) * 0.015;
                float maskEdge = waterLine + waveOffset;
                
                // Cria máscara suave
                                                float waterMask = smoothstep(maskEdge - transitionWidth, maskEdge + transitionWidth, verticalPos);
                
                                                                // Imagem original com peixe
                                vec4 originalColor = getColorWithFish(uv, fishX, fishY);

                                
                
                // Calcula refração apenas onde há água
                vec2 refraction = calculateRefraction(uv, u_time) * waterMask;
                vec2 distortedUV = uv + refraction;
                
                                // Obtém cor do background com peixe e distorção
                                vec4 backgroundColor = getColorWithFish(distortedUV, fishX, fishY);
                
                                // Adiciona efeito de profundidade
                float depth = (sin(uv.x * 3.0) + sin(uv.y * 4.0)) * 0.1 + 0.9;
                backgroundColor.rgb *= depth;

                
                
                // Calcula cáusticas apenas na área da água
                float caustics = calculateCaustics(uv, u_time) * waterMask;
                
                // Adiciona reflexões da superfície
                float fresnel = pow(1.0 - abs(dot(normalize(vec3(refraction, 1.0)), vec3(0.0, 0.0, 1.0))), 3.0);
                vec3 surfaceColor = vec3(0.2, 0.4, 0.6) * fresnel * 0.3 * waterMask;
                
                // Combina todos os efeitos da água
                vec3 waterColor = backgroundColor.rgb;
                waterColor += surfaceColor;
                waterColor += vec3(1.0, 1.0, 0.8) * caustics;
                
                // Adiciona um leve tint azulado para simular água
                waterColor = mix(waterColor, waterColor * vec3(0.9, 0.95, 1.1), 0.3 * waterMask);
                
                // Adiciona ondulação da superfície
                float surfaceWave = createWaves(uv, u_time) * 0.1 * waterMask + 0.9;
                waterColor *= surfaceWave;
                
                // Mistura entre imagem original e efeito de água
                vec3 finalColor = mix(originalColor.rgb, waterColor, waterMask);
                
                                                                                                // Adicionar exclamação com imagem fornecida
                if (u_showExclamation > 0.0 && u_gameState >= 4.0) { // fish_hooked
                                                            vec2 exclamationPos = vec2(fishX, fishY); // No centro do peixe

                    // Pulsação da exclamação para chamar atenção
                    float pulse = 0.98 + 0.02 * sin(u_time * 8.0);

                    // Tamanho da exclamação (ainda menor)
                    vec2 exclamationSize = vec2(0.015, 0.025) * pulse;

                    // Calcular UV da exclamação
                    vec2 exclamationUV = (uv - exclamationPos + exclamationSize * 0.5) / exclamationSize;

                    // Verificar se está na área da exclamação
                    if (exclamationUV.x >= 0.0 && exclamationUV.x <= 1.0 && exclamationUV.y >= 0.0 && exclamationUV.y <= 1.0) {
                        // Simular a imagem de exclamação amarela fornecida
                        vec2 localPos = exclamationUV * 2.0 - 1.0; // Converter para -1 a 1

                        // Corpo da exclamação (parte comprida) - corrigido para orientação correta
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
                                finalColor = mix(finalColor, vec3(0.0, 0.0, 0.0), 0.3);
                            }

                            // Aplicar cor da exclamação
                            finalColor = mix(finalColor, exclamationColor, 1.0);
                        }
                    }
                }

                gl_FragColor = vec4(finalColor, 1.0);
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

    // Obtém localizações dos atributos e uniforms
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
    this.uniforms.fishPosition = this.gl.getUniformLocation(
      this.program,
      "u_fishPosition",
    );
    this.uniforms.fishVelocity = this.gl.getUniformLocation(
      this.program,
      "u_fishVelocity",
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
    // Cria textura do background (gradiente padrão)
    this.createBackgroundTexture();

    // Cria textura de ruído
    this.createNoiseTexture();

    // Cria textura do peixe
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

    // Cria uma textura temporária azul para teste
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Desenha um peixe simples como fallback
    ctx.fillStyle = "#4A90E2";
    ctx.beginPath();
    ctx.ellipse(32, 32, 25, 15, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Cauda
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
    img.onerror = () => {
      console.log("Erro ao carregar imagem do peixe, usando fallback");
    };
    img.src =
      "https://cdn.builder.io/api/v1/image/assets%2Fae8512d3d0df4d1f8f1504a06406c6ba%2F62141810443b4226b05ad6c4f3dcd94e?format=webp&width=800";
  }

  // Métodos do jogo de pesca
  startFishingGame(hookX, hookY) {
    console.log("Starting fishing game at", hookX, hookY);
    this.gameState = "hook_cast";
    this.hookPosition = { x: hookX, y: hookY };
    this.canClickExclamation = false;

    // Gerar tempo de rea��ão aleatório entre 4-12 segundos
    this.fishReactionDelay = 4000 + Math.random() * 8000;
    this.fishReactionStartTime = Date.now();

    console.log(
      `Fish will react in ${this.fishReactionDelay}ms (after ${this.fishReactionDelay / 1000}s)`,
    );
  }

  // Método para lidar com clique na exclamação
  handleExclamationClick() {
    if (this.gameState === "fish_hooked" && this.canClickExclamation) {
      console.log("Player clicked exclamation! Opening modal.");
      this.canClickExclamation = false;
      if (this.onGameStart) {
        this.onGameStart();
      }
      return true;
    }
    return false;
  }

  // Sistema de Steering Behaviors
  updateSteeringBehaviors(deltaTime) {
    if (this.gameState === "idle" || this.gameState === "hook_cast") {
      // Comportamento de wandering natural
      this.wander(deltaTime);
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving" ||
      this.gameState === "fish_hooked"
    ) {
      // Comportamento de seek/arrive em direção ao anzol
      this.seek(this.hookPosition, deltaTime);
    }

    // Aplicar física: velocidade += aceleração
    this.fishVelocity.x += this.fishAcceleration.x * deltaTime;
    this.fishVelocity.y += this.fishAcceleration.y * deltaTime;

    // Amortecimento para movimento mais suave (reduz velocidade gradualmente)
    const damping = 0.98; // Fator de amortecimento
    this.fishVelocity.x *= damping;
    this.fishVelocity.y *= damping;

    // Limitar velocidade máxima
    const speed = Math.sqrt(
      this.fishVelocity.x * this.fishVelocity.x +
        this.fishVelocity.y * this.fishVelocity.y,
    );
    if (speed > this.maxSpeed) {
      this.fishVelocity.x = (this.fishVelocity.x / speed) * this.maxSpeed;
      this.fishVelocity.y = (this.fishVelocity.y / speed) * this.maxSpeed;
    }

    // Aplicar velocidade: posição += velocidade
    this.fishPosition.x += this.fishVelocity.x * deltaTime;
    this.fishPosition.y += this.fishVelocity.y * deltaTime;

    // Manter dentro dos limites da água
    this.fishPosition.x = Math.max(0.05, Math.min(0.95, this.fishPosition.x));
    this.fishPosition.y = Math.max(0.45, Math.min(0.95, this.fishPosition.y));

    // Resetar aceleração para próximo frame
    this.fishAcceleration.x = 0;
    this.fishAcceleration.y = 0;
  }

  // Comportamento Wander - vagar aleatoriamente com movimento curvilíneo
  wander(deltaTime) {
    // Normalizar velocidade para direção
    const speed = Math.sqrt(
      this.fishVelocity.x * this.fishVelocity.x +
        this.fishVelocity.y * this.fishVelocity.y,
    );
    const directionX = speed > 0.0001 ? this.fishVelocity.x / speed : 1;
    const directionY = speed > 0.0001 ? this.fishVelocity.y / speed : 0;

    // Criar círculo de wandering à frente do peixe
    const circleCenter = {
      x: this.fishPosition.x + directionX * this.wanderDistance,
      y: this.fishPosition.y + directionY * this.wanderDistance,
    };

    // Atualizar ângulo de wandering com variação ultra suave
    this.wanderAngle +=
      (Math.random() - 0.5) * this.wanderJitter * deltaTime * 0.0005; // Ultra suave para reduzir oscilações

    // Calcular ponto alvo no círculo de wandering
    this.wanderTarget.x =
      circleCenter.x + Math.cos(this.wanderAngle) * this.wanderRadius;
    this.wanderTarget.y =
      circleCenter.y + Math.sin(this.wanderAngle) * this.wanderRadius;

    // Aplicar força de steering em direção ao alvo com intensidade reduzida
    const seekForce = 0.3; // Reduzir intensidade do seek
    this.seekWithForce(this.wanderTarget, deltaTime, seekForce);

    // Adicionar força de separação das bordas
    this.separate(deltaTime);

    // Adicionar pequena força de flutuação para movimento orgânico
    const floatForce = {
      x: Math.sin(this.fishTime * 0.001) * 0.00001,
      y: Math.cos(this.fishTime * 0.0008) * 0.00001,
    };
    this.fishAcceleration.x += floatForce.x;
    this.fishAcceleration.y += floatForce.y;
  }

  // Comportamento Seek com intensidade customizável
  seekWithForce(target, deltaTime, forceMultiplier = 1.0) {
    // Calcular direção desejada
    const desired = {
      x: target.x - this.fishPosition.x,
      y: target.y - this.fishPosition.y,
    };

    // Normalizar e multiplicar pela velocidade máxima
    const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
    if (distance > 0) {
      desired.x = (desired.x / distance) * this.maxSpeed;
      desired.y = (desired.y / distance) * this.maxSpeed;

      // Comportamento Arrive - desacelerar quando próximo do alvo
      if (distance < 0.1) {
        const arrivalForce = distance / 0.1; // Gradualmente reduz força
        desired.x *= arrivalForce;
        desired.y *= arrivalForce;
      }
    }

    // Calcular força de steering
    const steer = {
      x: desired.x - this.fishVelocity.x,
      y: desired.y - this.fishVelocity.y,
    };

    // Limitar força máxima e aplicar multiplicador
    const steerMagnitude = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
    if (steerMagnitude > this.maxForce) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce;
      steer.y = (steer.y / steerMagnitude) * this.maxForce;
    }

    // Aplicar força de steering com multiplicador
    this.fishAcceleration.x += steer.x * forceMultiplier;
    this.fishAcceleration.y += steer.y * forceMultiplier;
  }

  // Comportamento Seek - ir em direção ao alvo
  seek(target, deltaTime) {
    // Calcular direção desejada
    const desired = {
      x: target.x - this.fishPosition.x,
      y: target.y - this.fishPosition.y,
    };

    // Normalizar e multiplicar pela velocidade máxima
    const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
    if (distance > 0) {
      desired.x = (desired.x / distance) * this.maxSpeed;
      desired.y = (desired.y / distance) * this.maxSpeed;

      // Comportamento Arrive - desacelerar quando próximo do alvo
      if (distance < 0.1) {
        const arrivalForce = distance / 0.1; // Gradualmente reduz força
        desired.x *= arrivalForce;
        desired.y *= arrivalForce;
      }
    }

    // Calcular força de steering
    const steer = {
      x: desired.x - this.fishVelocity.x,
      y: desired.y - this.fishVelocity.y,
    };

    // Limitar força máxima
    const steerMagnitude = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
    if (steerMagnitude > this.maxForce) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce;
      steer.y = (steer.y / steerMagnitude) * this.maxForce;
    }

    // Aplicar força de steering
    this.fishAcceleration.x += steer.x;
    this.fishAcceleration.y += steer.y;
  }

  // Comportamento Separate - evitar bordas
  separate(deltaTime) {
    const separationForce = { x: 0, y: 0 };
    const desiredSeparation = 0.15; // Distância desejada das bordas

    // Força para evitar borda esquerda
    if (this.fishPosition.x < desiredSeparation) {
      separationForce.x += (desiredSeparation - this.fishPosition.x) * 0.001;
    }

    // Força para evitar borda direita
    if (this.fishPosition.x > 1 - desiredSeparation) {
      separationForce.x -=
        (this.fishPosition.x - (1 - desiredSeparation)) * 0.001;
    }

    // Força para evitar borda superior
    if (this.fishPosition.y < 0.45 + desiredSeparation) {
      separationForce.y +=
        (0.45 + desiredSeparation - this.fishPosition.y) * 0.001;
    }

    // Força para evitar borda inferior
    if (this.fishPosition.y > 1 - desiredSeparation) {
      separationForce.y -=
        (this.fishPosition.y - (1 - desiredSeparation)) * 0.001;
    }

    // Aplicar força de separação
    this.fishAcceleration.x += separationForce.x;
    this.fishAcceleration.y += separationForce.y;
  }

  updateFishingGame() {
    if (this.gameState === "hook_cast") {
      const elapsedTime = Date.now() - this.fishReactionStartTime;

      // Debug: log do tempo a cada segundo
      if (
        Math.floor(elapsedTime / 1000) !== Math.floor((elapsedTime - 16) / 1000)
      ) {
        console.log(
          `Fish reaction timer: ${(elapsedTime / 1000).toFixed(1)}s / ${(this.fishReactionDelay / 1000).toFixed(1)}s`,
        );
      }

      if (elapsedTime >= this.fishReactionDelay) {
        // Usar posição atual do sistema de steering behaviors
        const currentFishX = this.fishPosition.x;
        const currentFishY = this.fishPosition.y;

        // Mudar estado para reação - o sistema de steering behaviors cuidará do movimento
        this.gameState = "fish_reacting";

        // Começar movimento suave após breve pausa
        setTimeout(() => {
          if (this.gameState === "fish_reacting") {
            this.gameState = "fish_moving";
          }
        }, 500);

        // Debug: verificar se posição JS bate com shader
        console.log(
          `🎣 REACTION DEBUG - Hook at: (${this.hookPosition.x.toFixed(3)}, ${this.hookPosition.y.toFixed(3)})`,
        );
        console.log(
          `🐟 REACTION DEBUG - Fish position (JS calc): (${currentFishX.toFixed(3)}, ${currentFishY.toFixed(3)})`,
        );
        console.log(
          `🐟 REACTION DEBUG - fishTime: ${this.fishTime.toFixed(2)}, fishTimeOffset: ${this.fishTimeOffset.toFixed(4)}`,
        );
        // Verificar se há transição ativa que pode afetar a posição
        let transitionSmoothing = 0.0;
        if (this.transitionBackToNaturalTime > 0) {
          const elapsedTime = Date.now() - this.transitionBackToNaturalTime;
          const progress = Math.min(
            elapsedTime / this.transitionBackToNaturalDuration,
            1,
          );
          transitionSmoothing = 1.0 - progress;
        }

        console.log(
          `🐟 REACTION DEBUG - adjustedTime used: ${adjustedTime.toFixed(4)}, moveX: ${moveX.toFixed(4)}, moveY: ${moveY.toFixed(4)}`,
        );
        console.log(
          `🐟 REACTION DEBUG - transitionSmoothing: ${transitionSmoothing.toFixed(4)}`,
        );

        // Se há transição ativa, a posição real é interpolada
        if (transitionSmoothing > 0.0) {
          const progress = 1.0 - transitionSmoothing;
          const easeProgress = 1.0 - Math.pow(1.0 - progress, 3.0); // Cubic ease-out
          const interpolatedX =
            this.transitionStartPosition.x +
            (currentFishX - this.transitionStartPosition.x) * easeProgress;
          const interpolatedY =
            this.transitionStartPosition.y +
            (currentFishY - this.transitionStartPosition.y) * easeProgress;

          console.log(
            `🐟 REACTION DEBUG - Using interpolated position: (${interpolatedX.toFixed(3)}, ${interpolatedY.toFixed(3)}) instead of natural (${currentFishX.toFixed(3)}, ${currentFishY.toFixed(3)})`,
          );

          // Usar posição interpolada como ponto de partida
          this.fishTargetPosition = { x: interpolatedX, y: interpolatedY };
        } else {
          this.fishTargetPosition = { x: currentFishX, y: currentFishY };
        }

        console.log(
          "Fish is now reacting to hook from position:",
          this.fishTargetPosition,
        );
      }
    } else if (
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_moving"
    ) {
      // Verificar se o peixe chegou próximo ao anzol usando posição do steering system
      const dx = this.hookPosition.x - this.fishPosition.x;
      const dy = this.hookPosition.y - this.fishPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.03) {
        // ainda não chegou ao anzol, manter movimento
        if (this.gameState === "fish_reacting") {
          this.gameState = "fish_moving";
        }

        // Log de debug a cada 100 frames (~1.6s)
        if (Math.random() < 0.01) {
          console.log(
            `🐟 MOVING - Fish at (${this.fishPosition.x.toFixed(3)}, ${this.fishPosition.y.toFixed(3)}), hook at (${this.hookPosition.x.toFixed(3)}, ${this.hookPosition.y.toFixed(3)}), distance: ${distance.toFixed(3)}`,
          );
        }
      } else {
        // Peixe chegou ao anzol
        this.gameState = "fish_hooked";
        this.exclamationTime = 1000; // mostrar exclamação por 1 segundo
        this.exclamationStartTime = Date.now();
        this.canClickExclamation = true;
        console.log("Fish hooked! Starting exclamation timer.");

        // Timer de 1 segundo - se não clicar, voltar ao movimento natural
        setTimeout(() => {
          if (this.gameState === "fish_hooked" && this.canClickExclamation) {
            console.log(
              "Player didn't click exclamation in time - fish returns to natural movement",
            );
            this.resetFishingGame();
          }
        }, 1000);
      }
    } else if (this.gameState === "fish_hooked") {
      if (this.exclamationTime > 0) {
        this.exclamationTime -= 16;

        // Se passou 1 segundo, desabilitar clique
        const elapsedTime = Date.now() - this.exclamationStartTime;
        if (elapsedTime >= 1000) {
          this.canClickExclamation = false;
        }
      }
    }
  }

  resetFishingGame() {
    // Se o peixe estava em estado direcionado, ajustar fishTime para continuar da posição atual
    if (
      this.gameState === "fish_moving" ||
      this.gameState === "fish_reacting" ||
      this.gameState === "fish_hooked"
    ) {
      const currentX = this.fishTargetPosition.x;
      const currentY = this.fishTargetPosition.y;

      console.log(
        `Fish was in ${this.gameState}, adjusting natural movement to continue from (${currentX.toFixed(2)}, ${currentY.toFixed(2)})`,
      );

      // Salvar a posição atual como ponto de início da transição
      this.transitionStartPosition = { x: currentX, y: currentY };
      this.transitionBackToNaturalTime = Date.now(); // Iniciar timer de suavização

      console.log(
        `🐟 RESET DEBUG - Posição atual do peixe: (${currentX.toFixed(3)}, ${currentY.toFixed(3)})`,
      );
      console.log(
        `🐟 RESET DEBUG - transitionStartPosition definida como: (${this.transitionStartPosition.x.toFixed(3)}, ${this.transitionStartPosition.y.toFixed(3)})`,
      );

      // NÃO ajustar fishTimeOffset - deixar o movimento natural continuar normalmente
      // A transição será feita pela interpolação no shader
      console.log(
        `���� RESET DEBUG - Deixando fishTimeOffset como: ${this.fishTimeOffset.toFixed(4)} (não alterado)`,
      );

      // Salvar a posição atual para garantir continuidade
      this.originalFishMovement = { moveX: currentX, moveY: currentY };
    }

    this.gameState = "idle";
    this.hookPosition = { x: 0.5, y: 0.5 };
    this.fishReactionStartTime = 0;
    this.fishReactionDelay = 0;
    this.exclamationTime = 0;
  }

  adjustFishTimeToPosition(targetX, targetY) {
    // Calcular qual fishTime resultaria na posição desejada
    // Usar busca iterativa refinada em três fases para maior precisão

    let bestOffset = 0;
    let bestDistance = Infinity;

    // Primeira fase: busca grosseira ampla
    for (let offset = 0; offset < Math.PI * 8; offset += 0.1) {
      const distance = this.calculateDistanceForOffset(
        targetX,
        targetY,
        offset,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = offset;
      }
    }

    // Segunda fase: busca média ao redor do melhor resultado
    const searchRange1 = 0.2;
    const searchStep1 = 0.01;
    for (
      let offset = bestOffset - searchRange1;
      offset <= bestOffset + searchRange1;
      offset += searchStep1
    ) {
      const distance = this.calculateDistanceForOffset(
        targetX,
        targetY,
        offset,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = offset;
      }
    }

    // Terceira fase: busca ultrafina para máxima precisão
    const searchRange2 = 0.02;
    const searchStep2 = 0.001;
    for (
      let offset = bestOffset - searchRange2;
      offset <= bestOffset + searchRange2;
      offset += searchStep2
    ) {
      const distance = this.calculateDistanceForOffset(
        targetX,
        targetY,
        offset,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = offset;
      }
    }

    this.fishTimeOffset = bestOffset;
    console.log(
      `🎯 OFFSET DEBUG - Set fishTimeOffset to ${bestOffset.toFixed(4)} (distance: ${bestDistance.toFixed(6)})`,
    );

    // Verificar qual posição resulta com este offset
    const testResult = this.calculateDistanceForOffset(
      targetX,
      targetY,
      bestOffset,
    );
    // Usar a nova fórmula melhorada
    const time = (this.fishTime + bestOffset) * 0.15;
    const mainCycle = time * 0.25;

    const xWave1 = Math.sin(mainCycle) * 0.35;
    const xWave2 = Math.sin(mainCycle * 0.7 + 1.2) * 0.15;
    const xWave3 = Math.cos(mainCycle * 1.3 + 2.5) * 0.08;
    const baseX = 0.5 + (xWave1 + xWave2 + xWave3);

    const yWave1 = Math.cos(mainCycle * 0.8) * 0.18;
    const yWave2 = Math.sin(mainCycle * 1.1 + 0.8) * 0.08;
    const yWave3 = Math.cos(mainCycle * 0.6 + 1.5) * 0.05;
    const baseY = 0.7 + (yWave1 + yWave2 + yWave3);

    const organicX =
      Math.sin(time * 0.4 + Math.PI) * 0.06 +
      Math.cos(time * 0.6 + 1.57) * 0.04;
    const organicY =
      Math.cos(time * 0.35 + 2.1) * 0.03 + Math.sin(time * 0.55 + 0.5) * 0.025;

    const driftX = Math.sin(time * 0.08) * 0.12;
    const driftY = Math.cos(time * 0.06) * 0.06;

    const naturalFishX = baseX + organicX + driftX;
    const naturalFishY = baseY + organicY + driftY;

    const resultX = Math.max(0.05, Math.min(0.95, naturalFishX));
    const resultY = Math.max(0.45, Math.min(0.95, naturalFishY));
    console.log(
      `🎯 OFFSET DEBUG - Target: (${targetX.toFixed(3)}, ${targetY.toFixed(3)}) -> Result: (${resultX.toFixed(3)}, ${resultY.toFixed(3)})`,
    );
  }

  calculateDistanceForOffset(targetX, targetY, offset) {
    // Usar a mesma fórmula melhorada do shader
    const time = (this.fishTime + offset) * 0.15;
    const mainCycle = time * 0.25;

    // Movimento em X com múltiplas ondas sobrepostas
    const xWave1 = Math.sin(mainCycle) * 0.35;
    const xWave2 = Math.sin(mainCycle * 0.7 + 1.2) * 0.15;
    const xWave3 = Math.cos(mainCycle * 1.3 + 2.5) * 0.08;
    const baseX = 0.5 + (xWave1 + xWave2 + xWave3);

    // Movimento em Y com flutuaç��o suave
    const yWave1 = Math.cos(mainCycle * 0.8) * 0.18;
    const yWave2 = Math.sin(mainCycle * 1.1 + 0.8) * 0.08;
    const yWave3 = Math.cos(mainCycle * 0.6 + 1.5) * 0.05;
    const baseY = 0.7 + (yWave1 + yWave2 + yWave3);

    // Variações orgânicas
    const organicX =
      Math.sin(time * 0.4 + Math.PI) * 0.06 +
      Math.cos(time * 0.6 + 1.57) * 0.04;
    const organicY =
      Math.cos(time * 0.35 + 2.1) * 0.03 + Math.sin(time * 0.55 + 0.5) * 0.025;

    // Deriva lenta
    const driftX = Math.sin(time * 0.08) * 0.12;
    const driftY = Math.cos(time * 0.06) * 0.06;

    // Posição final
    const naturalFishX = baseX + organicX + driftX;
    const naturalFishY = baseY + organicY + driftY;

    // Clamp igual ao shader
    const testX = Math.max(0.05, Math.min(0.95, naturalFishX));
    const testY = Math.max(0.45, Math.min(0.95, naturalFishY));

    return Math.sqrt((testX - targetX) ** 2 + (testY - targetY) ** 2);
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

    this.time += 0.016 * this.animationSpeed;
    this.fishTime += 0.016; // Tempo independente para o peixe (sempre constante)

    // Atualizar sistema de steering behaviors
    this.updateSteeringBehaviors(16); // 16ms delta time

    // Atualizar lógica do jogo de pesca
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

    // Define uniforms
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
      transitionSmoothing = 1.0 - progress; // 1.0 inicialmente, vai para 0.0

      // Log de debug apenas no início e no fim da transição
      if (transitionSmoothing > 0.95 || transitionSmoothing < 0.05) {
        console.log(
          `🔄 TRANSITION DEBUG - smoothing: ${transitionSmoothing.toFixed(3)}, progress: ${progress.toFixed(3)}, startPos: (${this.transitionStartPosition.x.toFixed(3)}, ${this.transitionStartPosition.y.toFixed(3)})`,
        );
      }
    }
    this.gl.uniform1f(this.uniforms.transitionSmoothing, transitionSmoothing);
    this.gl.uniform2f(
      this.uniforms.transitionStartPosition,
      this.transitionStartPosition.x,
      this.transitionStartPosition.y,
    );

    // Uniforms do sistema de steering behaviors
    this.gl.uniform2f(
      this.uniforms.fishPosition,
      this.fishPosition.x,
      this.fishPosition.y,
    );
    this.gl.uniform2f(
      this.uniforms.fishVelocity,
      this.fishVelocity.x,
      this.fishVelocity.y,
    );

    // Log de debug apenas quando há transição ativa
    if (transitionSmoothing > 0) {
      console.log(
        `📤 UNIFORM DEBUG - Enviando para shader: smoothing=${transitionSmoothing.toFixed(3)}, startPos=(${this.transitionStartPosition.x.toFixed(3)}, ${this.transitionStartPosition.y.toFixed(3)})`,
      );
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

    // Desenha
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(() => this.render());
  }
}

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
  const { user } = useAuthStore();
  const waterEffectRef = useRef<WaterEffect | null>(null);
  const [fishingSettings, setFishingSettings] =
    useState<FishingSettings | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [showFishingModal, setShowFishingModal] = useState(false);

  const isAdmin = user?.isAdmin || false;

  // Load fishing settings
  useEffect(() => {
    const loadSettings = async () => {
      console.log("Loading fishing settings...");
      const settings = await fishingSettingsService.getFishingSettings();
      console.log("Loaded settings:", settings);
      setFishingSettings(settings);
    };

    loadSettings();

    // Subscribe to settings changes
    const subscription =
      fishingSettingsService.subscribeToFishingSettings(setFishingSettings);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize water effect
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const waterEffect = new WaterEffect();

        // Configurar callback para abrir modal
        waterEffect.onGameStart = () => {
          console.log("Opening fishing game modal");
          setShowFishingModal(true);
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
            const fishX = waterEffect.fishPosition.x;
            const fishY = waterEffect.fishPosition.y;
            const exclamationX = fishX;
            const exclamationY = fishY - 0.08;

            // Verificar se clicou na área da exclamação
            const distance = Math.sqrt(
              Math.pow(x - exclamationX, 2) + Math.pow(y - exclamationY, 2),
            );

            if (distance <= 0.05) {
              // Área clicável da exclamação
              waterEffect.handleExclamationClick();
            }
          }
        };

        const canvas = document.getElementById("waterCanvas");
        if (canvas) {
          canvas.addEventListener("click", handleCanvasClick);
        }

        // Apply settings from database if available
        if (fishingSettings) {
          waterEffect.waveIntensity = fishingSettings.waveIntensity;
          waterEffect.distortionAmount = fishingSettings.distortionAmount;
          waterEffect.animationSpeed = fishingSettings.animationSpeed;

          // Update background if custom image is set
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
        console.error("Error initializing WaterEffect:", error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [fishingSettings]);

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
    console.log("DEBUG - handleBackgroundUpload called:", {
      isAdmin,
      hasFiles: !!event.target.files?.[0],
      fileName: event.target.files?.[0]?.name,
    });

    if (!isAdmin || !event.target.files?.[0]) {
      console.log("DEBUG - Upload blocked: not admin or no file");
      return;
    }

    const file = event.target.files[0];
    setIsUpdatingSettings(true);

    console.log("DEBUG - Uploading file:", file.name);
    const result = await fishingSettingsService.uploadBackgroundImage(file);
    console.log("DEBUG - Upload result:", result);

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
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Background Layer */}
      <div
        id="backgroundLayer"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      ></div>

      {/* Water Canvas */}
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
      ></canvas>

      {/* Fishing Rod Component */}
      <FishingRod
        waterArea={{
          x: 0,
          y: 0.6, // 60% da altura da tela (waterLevel original)
          width: 1,
          height: 0.4, // 40% restante da altura
          shape: "rectangle",
        }}
        onHookCast={(x, y) => {
          // Converter coordenadas de pixel para UV (0-1)
          const uvX = x / window.innerWidth;
          const uvY = y / window.innerHeight;
          console.log("Hook cast at UV coordinates:", uvX, uvY);

          if (waterEffectRef.current) {
            waterEffectRef.current.startFishingGame(uvX, uvY);
          }
        }}
        onLineReeled={() => {
          console.log("Line reeled in - resetting fishing game");
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
            background: "rgba(255, 255, 255, 0.9)",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #e5e5e5",
            opacity: isUpdatingSettings ? 0.6 : 1,
            pointerEvents: isUpdatingSettings ? "none" : "auto",
          }}
        >
          <div
            style={{
              marginBottom: "5px",
              fontSize: "0.75rem",
              color: "#666",
              fontWeight: "bold",
            }}
          >
            CONTROLES DE ADMINISTRADOR
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
              Intensidade das Ondas:{" "}
              {(fishingSettings?.waveIntensity || 0.5).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={(fishingSettings?.waveIntensity || 0.5) * 100}
              onChange={(e) => {
                console.log(
                  "DEBUG - Wave intensity slider changed:",
                  e.target.value,
                );
                handleSettingUpdate(
                  "waveIntensity",
                  parseInt(e.target.value) / 100,
                );
              }}
              style={{ width: "150px" }}
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
                console.log(
                  "DEBUG - Distortion slider changed:",
                  e.target.value,
                );
                handleSettingUpdate(
                  "distortionAmount",
                  parseInt(e.target.value) / 100,
                );
              }}
              style={{ width: "150px" }}
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
                console.log(
                  "DEBUG - Animation speed slider changed:",
                  e.target.value,
                );
                handleSettingUpdate(
                  "animationSpeed",
                  parseInt(e.target.value) / 100,
                );
              }}
              style={{ width: "150px" }}
              disabled={isUpdatingSettings}
            />
          </div>

          <div style={{ marginBottom: "0" }}>
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
              style={{ fontSize: "0.875rem" }}
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
        </div>
      )}

      {/* Info */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          zIndex: 20,
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "0.875rem",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div>WebGL Water Effect</div>
        <div>Use os controles para ajustar o efeito</div>
      </div>

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
              Parabéns! Você conseguiu fisgar um peixe. Agora é hora de jogá-lo
              no jogo de pesca!
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
                  console.log("Starting fishing mini-game...");
                  // Aqui você pode adicionar a lógica do mini-jogo
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
                Jogar Mini-Game
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
