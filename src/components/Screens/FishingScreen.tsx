import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Fish } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

// WebGL Water Effect Component
class WaterEffect {
  constructor(canvas: HTMLCanvasElement, backgroundImageUrl?: string) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!this.gl) {
      console.error("WebGL não é suportado neste navegador");
      return;
    }

    this.program = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.backgroundTexture = null;
    this.noiseTexture = null;

    this.uniforms = {};
    this.attributes = {};

    this.waveIntensity = 0.5;
    this.distortionAmount = 0.3;
    this.animationSpeed = 1.0;
    this.time = 0;
    this.animationId = null;

    this.init(backgroundImageUrl);
  }

  init(backgroundImageUrl?: string) {
    this.resizeCanvas();

    this.createShaders();
    this.createGeometry();
    this.createTextures(backgroundImageUrl);
    this.render();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  createShaders() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      void main() {
        v_texCoord = a_texCoord;
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
      
      varying vec2 v_texCoord;
      varying vec2 v_position;

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

      float createWaves(vec2 uv, float time) {
        float wave1 = sin(uv.x * 6.0 + time * 1.5) * 0.1;
        float wave2 = sin(uv.y * 8.0 + time * 2.0) * 0.08;
        float wave3 = sin((uv.x + uv.y) * 12.0 + time * 1.2) * 0.05;
        
        float noise1 = snoise(uv * 10.0 + time * 0.5) * 0.03;
        float noise2 = snoise(uv * 20.0 + time * 0.8) * 0.02;
        
        return (wave1 + wave2 + wave3 + noise1 + noise2) * u_waveIntensity;
      }

      vec2 calculateRefraction(vec2 uv, float time) {
        float waveHeight = createWaves(uv, time);
        
        vec2 epsilon = vec2(0.01, 0.0);
        float heightRight = createWaves(uv + epsilon.xy, time);
        float heightUp = createWaves(uv + epsilon.yx, time);
        
        vec2 gradient = vec2(heightRight - waveHeight, heightUp - waveHeight) / epsilon.x;
        
        return gradient * u_distortionAmount;
      }

      float calculateCaustics(vec2 uv, float time) {
        vec2 causticsUV = uv * 15.0;
        
        float caustic1 = abs(sin(causticsUV.x + time * 2.0));
        float caustic2 = abs(sin(causticsUV.y + time * 1.5));
        float caustic3 = abs(sin((causticsUV.x + causticsUV.y) * 0.5 + time));
        
        float noise = snoise(causticsUV + time * 0.3);
        
        return pow(caustic1 * caustic2 * caustic3 + noise * 0.2, 2.0) * 0.3;
      }

      void main() {
        vec2 uv = v_texCoord;
        
        vec2 refraction = calculateRefraction(uv, u_time);
        vec2 distortedUV = uv + refraction;
        
        vec4 backgroundColor = texture2D(u_backgroundTexture, distortedUV);
        
        float depth = (sin(uv.x * 3.0) + sin(uv.y * 4.0)) * 0.1 + 0.9;
        backgroundColor.rgb *= depth;
        
        float caustics = calculateCaustics(uv, u_time);
        
        float fresnel = pow(1.0 - abs(dot(normalize(vec3(refraction, 1.0)), vec3(0.0, 0.0, 1.0))), 3.0);
        vec3 surfaceColor = vec3(0.2, 0.4, 0.6) * fresnel * 0.3;
        
        vec3 finalColor = backgroundColor.rgb;
        finalColor += surfaceColor;
        finalColor += vec3(1.0, 1.0, 0.8) * caustics;
        
        finalColor = mix(finalColor, finalColor * vec3(0.9, 0.95, 1.1), 0.3);
        
        float surfaceWave = createWaves(uv, u_time) * 0.1 + 0.9;
        finalColor *= surfaceWave;
        
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
  }

  createShader(type: number, source: string) {
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

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
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

  createTextures(backgroundImageUrl?: string) {
    this.createBackgroundTexture(backgroundImageUrl);
    this.createNoiseTexture();
  }

  createBackgroundTexture(imageUrl?: string) {
    this.backgroundTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);

    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
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
      };
      img.src = imageUrl;
    } else {
      // Fallback gradient
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(1, "#764ba2");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

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

  updateWaveIntensity(value: number) {
    this.waveIntensity = value;
  }

  updateDistortionAmount(value: number) {
    this.distortionAmount = value;
  }

  updateAnimationSpeed(value: number) {
    this.animationSpeed = value;
  }

  updateBackgroundImage(imageUrl: string) {
    this.createBackgroundTexture(imageUrl);
  }

  render() {
    if (!this.gl || !this.program) return;

    this.time += 0.016 * this.animationSpeed;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

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

    this.gl.uniform1f(this.uniforms.time, this.time);
    this.gl.uniform1f(this.uniforms.waveIntensity, this.waveIntensity);
    this.gl.uniform1f(this.uniforms.distortionAmount, this.distortionAmount);
    this.gl.uniform2f(
      this.uniforms.resolution,
      this.canvas.width,
      this.canvas.height,
    );

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
    this.gl.uniform1i(this.uniforms.backgroundTexture, 0);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
    this.gl.uniform1i(this.uniforms.noiseTexture, 1);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

    this.animationId = requestAnimationFrame(() => this.render());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterEffectRef = useRef<WaterEffect | null>(null);
  const [waveIntensity, setWaveIntensity] = useState(50);
  const [distortionAmount, setDistortionAmount] = useState(30);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [selectedBackground, setSelectedBackground] = useState(0);

  const backgroundImages = [
    "https://cdn.builder.io/o/assets%2Fae8512d3d0df4d1f8f1504a06406c6ba%2F57e1aa1f4bc94d7f99db5d15b5592310?alt=media&token=8449b9f6-1053-4de3-87eb-3d8dfe87c5da&apiKey=ae8512d3d0df4d1f8f1504a06406c6ba",
    "https://cdn.builder.io/o/assets%2Fae8512d3d0df4d1f8f1504a06406c6ba%2F41ff183cad364357aef7c6f14223df0d?alt=media&token=82ee925c-f2b5-4c0a-a384-6f3399faac82&apiKey=ae8512d3d0df4d1f8f1504a06406c6ba",
  ];

  useEffect(() => {
    if (canvasRef.current) {
      waterEffectRef.current = new WaterEffect(
        canvasRef.current,
        backgroundImages[selectedBackground],
      );
    }

    return () => {
      if (waterEffectRef.current) {
        waterEffectRef.current.destroy();
      }
    };
  }, [selectedBackground]);

  useEffect(() => {
    if (waterEffectRef.current) {
      waterEffectRef.current.updateWaveIntensity(waveIntensity / 100);
    }
  }, [waveIntensity]);

  useEffect(() => {
    if (waterEffectRef.current) {
      waterEffectRef.current.updateDistortionAmount(distortionAmount / 100);
    }
  }, [distortionAmount]);

  useEffect(() => {
    if (waterEffectRef.current) {
      waterEffectRef.current.updateAnimationSpeed(animationSpeed / 100);
    }
  }, [animationSpeed]);

  const handleResize = () => {
    if (waterEffectRef.current) {
      waterEffectRef.current.resizeCanvas();
    }
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-700 pt-20 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <motion.button
          onClick={() => setCurrentScreen("exploration")}
          className="mb-6 bg-white/20 backdrop-blur text-white p-3 rounded-full hover:bg-white/30 transition-colors flex items-center gap-2 z-30 relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Voltar</span>
        </motion.button>

        {/* Main Content Window */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden relative"
          style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 relative z-20">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Fish className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Templo dos Anciões</h1>
                <p className="text-blue-100">Águas Místicas WebGL</p>
              </div>
            </div>
          </div>

          {/* Water Effect Canvas */}
          <div className="relative" style={{ height: "calc(100% - 102px)" }}>
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            />

            {/* Controls Panel */}
            <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Controles da Água
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Intensidade das Ondas
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={waveIntensity}
                    onChange={(e) => setWaveIntensity(Number(e.target.value))}
                    className="w-32 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Distorção
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={distortionAmount}
                    onChange={(e) =>
                      setDistortionAmount(Number(e.target.value))
                    }
                    className="w-32 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Velocidade
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                    className="w-32 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Background
                  </label>
                  <div className="flex gap-2">
                    {backgroundImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedBackground(index)}
                        className={`w-8 h-8 rounded-lg border-2 transition-colors ${
                          selectedBackground === index
                            ? "border-blue-500 bg-blue-100"
                            : "border-gray-300 bg-gray-100 hover:border-gray-400"
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="absolute bottom-4 left-4 z-20 bg-black/20 backdrop-blur-sm rounded-xl p-3 text-white">
              <div className="text-sm font-medium">Efeito de Água WebGL</div>
              <div className="text-xs opacity-80">
                Use os controles para ajustar
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
