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
                
                // Aplica distorção baseada no gradiente
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
            vec4 getColorWithFish(vec2 coords) {
                vec4 bgColor = texture2D(u_backgroundTexture, coords);

                                // Movimento natural do peixe com tempo independente
                float slowTime = u_fishTime * 0.2; // Movimento mais lento e independente

                // Padrão de movimento complexo usando múltiplas ondas
                float moveX = sin(slowTime * 0.7) * 0.3 + sin(slowTime * 1.3) * 0.15 + cos(slowTime * 0.4) * 0.1;
                float moveY = cos(slowTime * 0.5) * 0.08 + sin(slowTime * 1.1) * 0.06 + sin(slowTime * 0.8) * 0.04;

                // Normaliza para manter dentro dos limites (0.1 a 0.9 em X, área da água em Y)
                float fishX = 0.5 + moveX * 0.35; // Entre 0.15 e 0.85
                float fishY = 0.65 + moveY * 0.15; // Entre 0.5 e 0.8 (área da água)

                                

                                vec2 fishPos = vec2(fishX, fishY);
                vec2 fishSize = vec2(0.08, 0.06); // Diminuído de 0.15x0.12 para 0.08x0.06

                // Calcula direção baseada na derivada do movimento (mais responsivo)
                float derivative = cos(slowTime * 0.7) * 0.7 * 0.7 + cos(slowTime * 1.3) * 1.3 * 1.3 - sin(slowTime * 0.4) * 0.4 * 0.4;
                bool facingRight = derivative > 0.0;

                // Calcula UV do peixe com flip horizontal baseado na direção
                vec2 localUV = (coords - fishPos + fishSize * 0.5) / fishSize;
                vec2 fishUV;

                if (facingRight) {
                    // Flip horizontal quando vai para direita
                    fishUV = vec2(1.0 - localUV.x, localUV.y);
                } else {
                    // Normal quando vai para esquerda
                    fishUV = localUV;
                }

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
                vec4 originalColor = getColorWithFish(uv);

                                
                
                // Calcula refração apenas onde há água
                vec2 refraction = calculateRefraction(uv, u_time) * waterMask;
                vec2 distortedUV = uv + refraction;
                
                                // Obtém cor do background com peixe e distorção
                vec4 backgroundColor = getColorWithFish(distortedUV);
                
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
    this.time += 0.016 * this.animationSpeed;
    this.fishTime += 0.016; // Tempo independente para o peixe (sempre constante)

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
      <FishingRod />

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
    </div>
  );
};
