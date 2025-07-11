import React from "react";

/**
 * Utility functions for device detection and responsive design
 */

export const isMobileDevice = (): boolean => {
  // Check if we're running in browser
  if (typeof window === "undefined") return false;

  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "webos",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
    "mobile",
    "tablet",
  ];

  const isMobileUserAgent = mobileKeywords.some((keyword) =>
    userAgent.includes(keyword),
  );

  // Check for touch support
  const hasTouchSupport =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    ((window as any).DocumentTouch &&
      document instanceof (window as any).DocumentTouch);

  // Check screen size (mobile typically < 768px width)
  const isMobileScreenSize = window.innerWidth < 768;

  // Combine checks - must have touch support and either mobile user agent or small screen
  return hasTouchSupport && (isMobileUserAgent || isMobileScreenSize);
};

export const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    ((window as any).DocumentTouch &&
      document instanceof (window as any).DocumentTouch)
  );
};

export const isTablet = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const isTabletUserAgent =
    userAgent.includes("tablet") ||
    userAgent.includes("ipad") ||
    (userAgent.includes("android") && !userAgent.includes("mobile"));

  // Tablets typically have width between 768-1024px
  const isTabletScreenSize =
    window.innerWidth >= 768 && window.innerWidth <= 1024;

  return isTouchDevice() && (isTabletUserAgent || isTabletScreenSize);
};

export const getDeviceType = (): "mobile" | "tablet" | "desktop" => {
  if (isMobileDevice() && !isTablet()) return "mobile";
  if (isTablet()) return "tablet";
  return "desktop";
};

export const getScreenSize = () => {
  if (typeof window === "undefined") return { width: 0, height: 0 };

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const isLandscape = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth > window.innerHeight;
};

export const isPortrait = (): boolean => {
  return !isLandscape();
};

// Hook for reactive device detection
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = React.useState(() => ({
    isMobile: isMobileDevice(),
    isTablet: isTablet(),
    isTouch: isTouchDevice(),
    deviceType: getDeviceType(),
    screenSize: getScreenSize(),
    isLandscape: isLandscape(),
    isPortrait: isPortrait(),
  }));

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo({
        isMobile: isMobileDevice(),
        isTablet: isTablet(),
        isTouch: isTouchDevice(),
        deviceType: getDeviceType(),
        screenSize: getScreenSize(),
        isLandscape: isLandscape(),
        isPortrait: isPortrait(),
      });
    };

    // Update on resize and orientation change
    window.addEventListener("resize", updateDeviceInfo);
    window.addEventListener("orientationchange", updateDeviceInfo);

    return () => {
      window.removeEventListener("resize", updateDeviceInfo);
      window.removeEventListener("orientationchange", updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};
