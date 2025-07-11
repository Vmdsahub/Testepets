import { useEffect, useCallback, useRef } from "react";
import { isMobileDevice } from "../utils/deviceDetection";

interface PerformanceOptions {
  enableReducedMotion?: boolean;
  enableCanvasOptimization?: boolean;
  enableMemoryManagement?: boolean;
  enableFPSMonitoring?: boolean;
}

export const usePerformanceOptimization = (
  options: PerformanceOptions = {},
) => {
  const {
    enableReducedMotion = true,
    enableCanvasOptimization = true,
    enableMemoryManagement = true,
    enableFPSMonitoring = false,
  } = options;

  const performanceDataRef = useRef({
    fps: 60,
    memoryUsage: 0,
    isLowPerformance: false,
  });

  // Detect low-performance devices
  const detectLowPerformance = useCallback(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Check device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory || 4;

    // Check hardware concurrency
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;

    // Check if mobile device
    const isMobile = isMobileDevice();

    // Determine if device is low performance
    const isLowPerformance =
      prefersReducedMotion ||
      deviceMemory < 4 ||
      hardwareConcurrency < 4 ||
      (isMobile && deviceMemory < 3);

    performanceDataRef.current.isLowPerformance = isLowPerformance;

    return isLowPerformance;
  }, []);

  // Apply reduced motion
  const applyReducedMotion = useCallback(() => {
    if (!enableReducedMotion) return;

    const isLowPerformance = detectLowPerformance();

    if (isLowPerformance) {
      // Add class to reduce animations
      document.documentElement.classList.add(
        "mobile-reduced-motion",
        "respect-motion-preference",
      );

      // Reduce animation durations globally
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, [enableReducedMotion, detectLowPerformance]);

  // Optimize canvas performance
  const optimizeCanvas = useCallback(() => {
    if (!enableCanvasOptimization) return;

    const canvases = document.querySelectorAll("canvas");
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Enable image smoothing optimization
        ctx.imageSmoothingEnabled = !isMobileDevice();

        // Set quality based on device
        if (isMobileDevice()) {
          ctx.imageSmoothingQuality = "low";
        } else {
          ctx.imageSmoothingQuality = "high";
        }
      }

      // Add optimized classes
      canvas.classList.add("webgl-optimized", "gpu-accelerated");
    });
  }, [enableCanvasOptimization]);

  // Memory management
  const manageMemory = useCallback(() => {
    if (!enableMemoryManagement) return;

    // Clean up unused event listeners
    const cleanupUnusedListeners = () => {
      // Force garbage collection if available (Chrome DevTools)
      if ((window as any).gc) {
        (window as any).gc();
      }
    };

    // Clean up on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanupUnusedListeners();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enableMemoryManagement]);

  // FPS monitoring
  const monitorFPS = useCallback(() => {
    if (!enableFPSMonitoring) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        performanceDataRef.current.fps = fps;

        // Apply performance adjustments based on FPS
        if (fps < 30) {
          document.documentElement.classList.add("low-fps-mode");
          applyReducedMotion();
        } else {
          document.documentElement.classList.remove("low-fps-mode");
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }, [enableFPSMonitoring, applyReducedMotion]);

  // Apply all optimizations
  useEffect(() => {
    applyReducedMotion();
    optimizeCanvas();
    const memoryCleanup = manageMemory();
    monitorFPS();

    // Apply global performance classes
    document.documentElement.classList.add(
      "gpu-accelerated",
      "optimized-text",
      "focus-visible-only",
    );

    // Add safe area support for notched devices
    if (isMobileDevice()) {
      document.documentElement.classList.add("safe-area-support");
    }

    return () => {
      memoryCleanup?.();
    };
  }, [applyReducedMotion, optimizeCanvas, manageMemory, monitorFPS]);

  // Responsive media query listeners
  useEffect(() => {
    const mediaQueries = [
      {
        query: "(prefers-reduced-motion: reduce)",
        handler: applyReducedMotion,
      },
      { query: "(max-width: 768px)", handler: optimizeCanvas },
    ];

    mediaQueries.forEach(({ query, handler }) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addListener(handler);
    });

    return () => {
      mediaQueries.forEach(({ query, handler }) => {
        const mediaQuery = window.matchMedia(query);
        mediaQuery.removeListener(handler);
      });
    };
  }, [applyReducedMotion, optimizeCanvas]);

  return {
    performanceData: performanceDataRef.current,
    detectLowPerformance,
    optimizeCanvas,
    applyReducedMotion,
  };
};

// Utility function to get performance recommendations
export const getPerformanceRecommendations = () => {
  const isMobile = isMobileDevice();
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;

  const recommendations = [];

  if (isMobile) {
    recommendations.push(
      "Mobile device detected - enabling touch optimizations",
    );
  }

  if (deviceMemory < 4) {
    recommendations.push("Low memory device - reducing animation complexity");
  }

  if (hardwareConcurrency < 4) {
    recommendations.push(
      "Limited CPU cores - optimizing rendering performance",
    );
  }

  return recommendations;
};
