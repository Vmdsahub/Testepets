/**
 * Browser compatibility utilities and polyfills
 */

// Feature detection utilities
export const featureDetection = {
  // Check for modern JavaScript features
  supportsAsyncAwait: () => {
    try {
      return (async () => {})() instanceof Promise;
    } catch {
      return false;
    }
  },

  // Check for CSS features
  supportsBackdropFilter: () => {
    return (
      CSS.supports("backdrop-filter", "blur(10px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(10px)")
    );
  },

  supportsGridLayout: () => {
    return CSS.supports("display", "grid");
  },

  supportsFlexbox: () => {
    return CSS.supports("display", "flex");
  },

  // Check for Canvas features
  supportsCanvas: () => {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext && canvas.getContext("2d"));
  },

  supportsWebGL: () => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  },

  // Check for touch support
  supportsTouch: () => {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      ((window as any).DocumentTouch &&
        document instanceof (window as any).DocumentTouch)
    );
  },

  // Check for pointer events
  supportsPointerEvents: () => {
    return "PointerEvent" in window;
  },

  // Check for Web APIs
  supportsIntersectionObserver: () => {
    return "IntersectionObserver" in window;
  },

  supportsResizeObserver: () => {
    return "ResizeObserver" in window;
  },

  supportsLocalStorage: () => {
    try {
      const test = "__test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  supportsServiceWorker: () => {
    return "serviceWorker" in navigator;
  },

  // Check for performance APIs
  supportsPerformanceObserver: () => {
    return "PerformanceObserver" in window;
  },

  supportsRequestIdleCallback: () => {
    return "requestIdleCallback" in window;
  },
};

// Browser detection
export const browserDetection = {
  isChrome: () =>
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
  isFirefox: () => /Firefox/.test(navigator.userAgent),
  isSafari: () =>
    /Safari/.test(navigator.userAgent) &&
    /Apple Computer/.test(navigator.vendor),
  isEdge: () => /Edge/.test(navigator.userAgent),
  isIE: () => /MSIE|Trident/.test(navigator.userAgent),
  isOpera: () => /Opera/.test(navigator.userAgent),

  // Mobile browsers
  isMobileSafari: () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
  isMobileChrome: () =>
    /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent),
  isSamsung: () => /SamsungBrowser/.test(navigator.userAgent),

  // Get browser info
  getBrowserInfo: () => {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let version = "Unknown";

    if (browserDetection.isChrome()) {
      browser = "Chrome";
      version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (browserDetection.isFirefox()) {
      browser = "Firefox";
      version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (browserDetection.isSafari()) {
      browser = "Safari";
      version = ua.match(/Version\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (browserDetection.isEdge()) {
      browser = "Edge";
      version = ua.match(/Edge\/([0-9.]+)/)?.[1] || "Unknown";
    }

    return { browser, version };
  },
};

// Polyfills for older browsers
export const polyfills = {
  // Polyfill for requestAnimationFrame
  requestAnimationFrame: () => {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback: FrameRequestCallback) => {
        return window.setTimeout(callback, 1000 / 60);
      };
    }
  },

  // Polyfill for cancelAnimationFrame
  cancelAnimationFrame: () => {
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = (id: number) => {
        clearTimeout(id);
      };
    }
  },

  // Polyfill for Object.assign
  objectAssign: () => {
    if (!Object.assign) {
      Object.assign = (target: any, ...sources: any[]) => {
        sources.forEach((source) => {
          if (source) {
            Object.keys(source).forEach((key) => {
              target[key] = source[key];
            });
          }
        });
        return target;
      };
    }
  },

  // Polyfill for Array.from
  arrayFrom: () => {
    if (!Array.from) {
      Array.from = (arrayLike: any, mapFn?: any, thisArg?: any) => {
        const items = Object(arrayLike);
        const len = parseInt(items.length) || 0;
        const result = [];
        for (let i = 0; i < len; i++) {
          result[i] = mapFn ? mapFn.call(thisArg, items[i], i) : items[i];
        }
        return result;
      };
    }
  },

  // Initialize all polyfills
  initializeAll: () => {
    polyfills.requestAnimationFrame();
    polyfills.cancelAnimationFrame();
    polyfills.objectAssign();
    polyfills.arrayFrom();
  },
};

// CSS prefixes for vendor-specific properties
export const cssCompatibility = {
  getVendorPrefix: () => {
    const styles = window.getComputedStyle(document.documentElement, "");
    const pre = (Array.prototype.slice
      .call(styles)
      .join("")
      .match(/-(moz|webkit|ms)-/) ||
      (styles.OLink === "" && ["", "o"]))[1];

    return {
      dom: pre === "ms" ? "MS" : pre,
      lowercase: pre,
      css: `-${pre}-`,
      js: pre === "ms" ? pre : pre.charAt(0).toUpperCase() + pre.substr(1),
    };
  },

  // Apply vendor prefixes to CSS properties
  addVendorPrefixes: (property: string, value: string) => {
    const prefix = cssCompatibility.getVendorPrefix();
    const prefixedProperty = `${prefix.css}${property}`;

    return {
      [property]: value,
      [prefixedProperty]: value,
    };
  },
};

// Performance compatibility
export const performanceCompatibility = {
  // Cross-browser performance.now()
  now: () => {
    if (performance && performance.now) {
      return performance.now();
    }
    return Date.now();
  },

  // Cross-browser requestIdleCallback
  requestIdleCallback: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => {
    if (window.requestIdleCallback) {
      return window.requestIdleCallback(callback, options);
    }

    // Fallback implementation
    const start = performanceCompatibility.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () =>
          Math.max(0, 50 - (performanceCompatibility.now() - start)),
      });
    }, 1);
  },
};

// Initialize browser compatibility
export const initializeBrowserCompatibility = () => {
  // Initialize polyfills
  polyfills.initializeAll();

  // Add browser classes to document
  const { browser } = browserDetection.getBrowserInfo();
  document.documentElement.classList.add(`browser-${browser.toLowerCase()}`);

  // Add feature detection classes
  Object.entries(featureDetection).forEach(([feature, detect]) => {
    if (typeof detect === "function") {
      const className = detect() ? `supports-${feature}` : `no-${feature}`;
      document.documentElement.classList.add(className);
    }
  });

  // Add mobile classes
  if (featureDetection.supportsTouch()) {
    document.documentElement.classList.add("touch-device");
  } else {
    document.documentElement.classList.add("no-touch");
  }

  console.log("Browser compatibility initialized:", {
    browser: browserDetection.getBrowserInfo(),
    features: {
      canvas: featureDetection.supportsCanvas(),
      webgl: featureDetection.supportsWebGL(),
      touch: featureDetection.supportsTouch(),
      backdropFilter: featureDetection.supportsBackdropFilter(),
    },
  });
};

// Export compatibility status
export const getCompatibilityStatus = () => {
  return {
    browser: browserDetection.getBrowserInfo(),
    features: {
      canvas: featureDetection.supportsCanvas(),
      webgl: featureDetection.supportsWebGL(),
      touch: featureDetection.supportsTouch(),
      backdropFilter: featureDetection.supportsBackdropFilter(),
      gridLayout: featureDetection.supportsGridLayout(),
      flexbox: featureDetection.supportsFlexbox(),
      localStorage: featureDetection.supportsLocalStorage(),
      serviceWorker: featureDetection.supportsServiceWorker(),
    },
    isModernBrowser:
      featureDetection.supportsAsyncAwait() &&
      featureDetection.supportsFlexbox() &&
      featureDetection.supportsCanvas(),
  };
};
