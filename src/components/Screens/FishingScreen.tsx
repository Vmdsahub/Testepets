import React, { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

// WebGL Water Effect Class - With 60% coverage mask
class WaterEffect {
  constructor() {
    this.canvas = document.getElementById("waterCanvas");
    this.gl =
      this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");

    if (!this.gl) {
      alert("WebGL não é suportado neste navegador");
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

    this.init();
    this.setupControls();
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
                
                // Imagem original sem efeitos
                vec4 originalColor = texture2D(u_backgroundTexture, uv);
                
                // Calcula refração apenas onde há água
                vec2 refraction = calculateRefraction(uv, u_time) * waterMask;
                vec2 distortedUV = uv + refraction;
                
                // Obtém cor do background com distorção
                vec4 backgroundColor = texture2D(u_backgroundTexture, distortedUV);
                
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

  updateBackgroundFromImage(image) {
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

  setupControls() {
    const waveIntensitySlider = document.getElementById("waveIntensity");
    const distortionAmountSlider = document.getElementById("distortionAmount");
    const animationSpeedSlider = document.getElementById("animationSpeed");
    const backgroundUpload = document.getElementById("backgroundUpload");

    waveIntensitySlider.addEventListener("input", (e) => {
      this.waveIntensity = e.target.value / 100;
    });

    distortionAmountSlider.addEventListener("input", (e) => {
      this.distortionAmount = e.target.value / 100;
    });

    animationSpeedSlider.addEventListener("input", (e) => {
      this.animationSpeed = e.target.value / 100;
    });

    backgroundUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const img = new Image();
        img.onload = () => {
          this.updateBackgroundFromImage(img);

          // Atualiza também o background CSS
          const backgroundLayer = document.getElementById("backgroundLayer");
          backgroundLayer.style.backgroundImage = `url(${img.src})`;
          backgroundLayer.style.backgroundSize = "cover";
          backgroundLayer.style.backgroundPosition = "center";
        };
        img.src = URL.createObjectURL(file);
      }
    });
  }

  render() {
    this.time += 0.016 * this.animationSpeed;

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

    // Desenha
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(() => this.render());
  }
}

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
  const waterEffectRef = useRef<WaterEffect | null>(null);

  useEffect(() => {
    // Initialize the water effect after component mounts
    const timer = setTimeout(() => {
      waterEffectRef.current = new WaterEffect();
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
    };
  }, []);

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

      {/* Controls */}
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
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="waveIntensity"
            style={{
              display: "block",
              fontSize: "0.875rem",
              color: "#000000",
              marginBottom: "5px",
            }}
          >
            Intensidade das Ondas
          </label>
          <input
            type="range"
            id="waveIntensity"
            min="0"
            max="100"
            defaultValue="50"
            style={{ width: "150px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="distortionAmount"
            style={{
              display: "block",
              fontSize: "0.875rem",
              color: "#000000",
              marginBottom: "5px",
            }}
          >
            Distorção
          </label>
          <input
            type="range"
            id="distortionAmount"
            min="0"
            max="100"
            defaultValue="30"
            style={{ width: "150px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="animationSpeed"
            style={{
              display: "block",
              fontSize: "0.875rem",
              color: "#000000",
              marginBottom: "5px",
            }}
          >
            Velocidade
          </label>
          <input
            type="range"
            id="animationSpeed"
            min="0"
            max="200"
            defaultValue="100"
            style={{ width: "150px" }}
          />
        </div>

        <div style={{ marginBottom: "0" }}>
          <label
            htmlFor="backgroundUpload"
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
            id="backgroundUpload"
            accept="image/*"
            style={{ fontSize: "0.875rem" }}
          />
        </div>
      </div>

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
