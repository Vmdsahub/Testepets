import React, { useRef, useEffect } from "react";

const WaterEffectWebGL: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_uv = (a_position + 1.0) * 0.5;
    }
  `;

  // Advanced fragment shader for water effect
  const fragmentShaderSource = `
    precision highp float;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 v_uv;
    
    // Advanced noise functions
    vec2 hash22(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }
    
    float noise(vec2 p) {
      const float K1 = 0.366025404; // (sqrt(3)-1)/2;
      const float K2 = 0.211324865; // (3-sqrt(3))/6;
      
      vec2 i = floor(p + (p.x + p.y) * K1);
      vec2 a = p - i + (i.x + i.y) * K2;
      vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec2 b = a - o + K2;
      vec2 c = a - 1.0 + 2.0 * K2;
      
      vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
      vec3 n = h * h * h * h * vec3(dot(a, hash22(i + 0.0)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
      
      return dot(n, vec3(70.0));
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      
      return value;
    }
    
    // Multiple wave layers
    vec2 getWaveDistortion(vec2 uv, float time) {
            // Primary waves - large, very slow
      vec2 wave1 = vec2(
        sin(time * 0.3 + uv.x * 2.5 + uv.y * 1.5) * 0.006,
        cos(time * 0.35 + uv.y * 2.0 + uv.x * 1.0) * 0.006
      );
      
            // Secondary waves - medium, gentle
      vec2 wave2 = vec2(
        sin(time * 0.7 + uv.x * 4.0 - uv.y * 2.5) * 0.004,
        cos(time * 0.65 + uv.y * 3.5 + uv.x * 2.0) * 0.004
      );
      
            // Tertiary waves - small, subtle
      vec2 wave3 = vec2(
        sin(time * 1.0 + uv.x * 8.0 + uv.y * 4.0) * 0.002,
        cos(time * 0.9 + uv.y * 6.0 - uv.x * 3.0) * 0.002
      );
      
            // Noise-based organic distortion - much subtler
      float noiseScale = 0.002;
      vec2 noiseDistortion = vec2(
        fbm(uv * 3.0 + time * 0.15) * noiseScale,
        fbm(uv * 2.5 - time * 0.12) * noiseScale
      );
      
      return wave1 + wave2 + wave3 + noiseDistortion;
    }
    
    // Caustics effect
    float caustics(vec2 uv, float time) {
            vec2 p = uv * 4.0;
      
      float c = 0.0;
      
            // Fewer, gentler caustic layers
      for (int i = 0; i < 2; i++) {
        float fi = float(i);
                vec2 offset = vec2(sin(time * (0.4 + fi * 0.15)), cos(time * (0.3 + fi * 0.2))) * 1.0;
        
                float n1 = noise(p + offset + time * 0.25);
        float n2 = noise(p * 1.2 - offset + time * 0.2);
        
                c += pow(max(0.0, sin(n1 * 3.14) * sin(n2 * 3.14)), 1.5) * (0.3 + fi * 0.1);
      }
      
            return c * 0.5;
    }
    
    // Vignette effect
    float vignette(vec2 uv) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      return 1.0 - smoothstep(0.3, 0.8, dist);
    }
    
    void main() {
      vec2 uv = v_uv;
      float time = u_time;
      
      // Get wave distortion
      vec2 distortion = getWaveDistortion(uv, time);
      vec2 distortedUV = uv + distortion;
      
      // Create depth gradient
      float depth = 1.0 - uv.y;
      depth = smoothstep(0.0, 1.0, depth);
      
      // Water colors - deep blue gradient
      vec3 shallowColor = vec3(0.0, 0.36, 0.52);  // Darker blue
      vec3 deepColor = vec3(0.0, 0.15, 0.35);     // Very dark blue
      vec3 waterColor = mix(shallowColor, deepColor, depth);
      
      // Add caustics
      float causticsValue = caustics(distortedUV, time);
      vec3 causticsColor = vec3(0.4, 0.7, 1.0);
      
            // Blend caustics with water - much gentler
      float causticsStrength = 0.2 * depth;
      waterColor = mix(waterColor, causticsColor, causticsValue * causticsStrength);
      
      // Add surface foam/bubbles
      float foam = 0.0;
      if (uv.y < 0.1) {
                foam = noise(uv * 12.0 + time * 1.0) * 0.15;
        foam = smoothstep(0.4, 0.8, foam);
        waterColor = mix(waterColor, vec3(0.8, 0.9, 1.0), foam * (1.0 - uv.y * 10.0));
      }
      
      // Add underwater particles
      float particles = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 particlePos = vec2(
          sin(time * (0.5 + fi * 0.2) + fi * 2.0),
          cos(time * (0.3 + fi * 0.15) + fi * 3.0)
        ) * 0.3 + 0.5;
        
        float particleDist = length(distortedUV - particlePos);
        particles += 1.0 / (1.0 + particleDist * 50.0);
      }
      waterColor += particles * vec3(0.2, 0.3, 0.5) * 0.1;
      
      // Add subtle color variations
      vec3 colorVariation = vec3(
        sin(distortedUV.x * 3.0 + time * 0.5) * 0.1,
        sin(distortedUV.y * 2.5 - time * 0.4) * 0.08,
        sin((distortedUV.x + distortedUV.y) * 2.0 + time * 0.6) * 0.12
      );
      waterColor += colorVariation * 0.3;
      
      // Apply vignette
      float vignetteValue = vignette(uv);
      waterColor *= vignetteValue;
      
      // Add some brightness variation based on distortion
      float brightness = 1.0 + (distortion.x + distortion.y) * 5.0;
      waterColor *= brightness;
      
      // Final color with slight blue tint enhancement
      waterColor = mix(waterColor, vec3(0.0, 0.4, 0.7), 0.1);
      
      gl_FragColor = vec4(waterColor, 1.0);
    }
  `;

  const createShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const createProgram = (
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Error linking program:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  };

  const initWebGL = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return false;
    }

    glRef.current = gl as WebGLRenderingContext;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      return false;
    }

    programRef.current = program;

    // Set up geometry (fullscreen quad)
    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position",
    );
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    return true;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;

    if (!canvas || !gl) return;

    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }
  };

  const render = () => {
    const gl = glRef.current;
    const program = programRef.current;

    if (!gl || !program) return;

    resizeCanvas();

    const currentTime = (Date.now() - startTimeRef.current) * 0.001;

    gl.useProgram(program);

    // Set uniforms
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    gl.uniform1f(timeLocation, currentTime);
    gl.uniform2f(
      resolutionLocation,
      canvasRef.current!.width,
      canvasRef.current!.height,
    );

    // Clear and draw
    gl.clearColor(0.0, 0.15, 0.35, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    if (initWebGL()) {
      startTimeRef.current = Date.now();
      render();
    }

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
      }}
    />
  );
};

export default WaterEffectWebGL;
