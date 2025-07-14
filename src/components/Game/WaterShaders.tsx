import React, { useRef, useEffect, useState } from "react";

interface WaterShadersProps {
  width: number;
  height: number;
  className?: string;
}

const WaterShaders: React.FC<WaterShadersProps> = ({
  width,
  height,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = (a_position + 1.0) * 0.5;
    }
  `;

  // Fragment shader source for water animation
  const fragmentShaderSource = `
    precision mediump float;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;
    
    // Noise function for waves
    float noise(vec2 p) {
      return sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453123;
    }
    
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 5; i++) {
        value += amplitude * smoothNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      
      return value;
    }
    
    vec3 waterColor(vec2 uv, float time) {
      // Create animated waves
      vec2 wave1 = vec2(sin(time * 0.8 + uv.x * 6.0) * 0.1, cos(time * 0.6 + uv.y * 4.0) * 0.1);
      vec2 wave2 = vec2(sin(time * 1.2 + uv.y * 8.0) * 0.05, cos(time * 0.9 + uv.x * 5.0) * 0.05);
      
      vec2 distortion = wave1 + wave2;
      vec2 distortedUV = uv + distortion;
      
      // Create depth gradient
      float depth = 1.0 - uv.y;
      depth = smoothstep(0.0, 1.0, depth);
      
      // Base water colors - deeper blue as we go down
      vec3 shallowColor = vec3(0.2, 0.6, 0.9);  // Light blue
      vec3 deepColor = vec3(0.0, 0.2, 0.6);     // Dark blue
      vec3 baseColor = mix(shallowColor, deepColor, depth);
      
      // Add animated caustics (light patterns underwater)
      float caustics1 = fbm(distortedUV * 8.0 + time * 0.5);
      float caustics2 = fbm(distortedUV * 12.0 - time * 0.3);
      float causticsPattern = sin(caustics1 * 6.28) * sin(caustics2 * 6.28);
      causticsPattern = smoothstep(-0.5, 0.5, causticsPattern);
      
      // Apply caustics effect
      vec3 causticsColor = vec3(0.8, 0.9, 1.0);
      baseColor = mix(baseColor, causticsColor, causticsPattern * 0.3 * depth);
      
      // Add surface reflection
      float surface = 1.0 - smoothstep(0.0, 0.1, uv.y);
      vec3 reflectionColor = vec3(0.7, 0.8, 1.0);
      baseColor = mix(baseColor, reflectionColor, surface * 0.6);
      
      // Add animated ripples
      float ripple1 = sin(length(distortedUV - vec2(0.3, 0.7)) * 20.0 - time * 3.0) * 0.5 + 0.5;
      float ripple2 = sin(length(distortedUV - vec2(0.7, 0.4)) * 15.0 - time * 2.5) * 0.5 + 0.5;
      float ripples = (ripple1 + ripple2) * 0.1;
      
      baseColor += ripples * vec3(0.2, 0.3, 0.4);
      
      // Add foam at the surface
      float foam = smoothstep(0.95, 1.0, sin(uv.x * 20.0 + time * 2.0) + sin(uv.x * 15.0 - time * 1.5));
      foam *= surface;
      baseColor = mix(baseColor, vec3(1.0), foam * 0.7);
      
      return baseColor;
    }
    
    void main() {
      vec2 uv = v_texCoord;
      
      // Flip Y coordinate
      uv.y = 1.0 - uv.y;
      
      vec3 color = waterColor(uv, u_time);
      
      gl_FragColor = vec4(color, 0.9);
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

  const initWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return false;
    }

    glRef.current = gl;

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

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    return true;
  };

  const render = (timestamp: number) => {
    const gl = glRef.current;
    const program = programRef.current;

    if (!gl || !program) return;

    const time = timestamp * 0.001; // Convert to seconds

    gl.useProgram(program);

    // Set uniforms
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    gl.uniform1f(timeLocation, time);
    gl.uniform2f(resolutionLocation, width, height);

    // Clear and draw
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    if (initWebGL()) {
      setIsInitialized(true);
      animationRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!isInitialized) {
    // Fallback while WebGL initializes
    return (
      <div
        className={className}
        style={{
          background: `
            linear-gradient(180deg, 
              #0ea5e9 0%,
              #0284c7 25%,
              #0369a1 50%,
              #1e3a8a 100%
            )
          `,
          width,
          height,
        }}
      />
    );
  }

  return (
    <canvas ref={canvasRef} className={className} style={{ width, height }} />
  );
};

export default WaterShaders;
