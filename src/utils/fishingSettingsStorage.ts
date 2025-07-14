/**
 * Local storage utility for fishing settings persistence
 * Used when running in mock mode to simulate database persistence
 */

export interface StoredFishingSettings {
  id: string;
  waveIntensity: number;
  distortionAmount: number;
  animationSpeed: number;
  backgroundImageUrl: string | null;
  updatedAt: string;
}

const STORAGE_KEY = "xenopets-fishing-settings";

export const fishingSettingsStorage = {
  /**
   * Get stored fishing settings from localStorage
   */
  get(): StoredFishingSettings | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error reading fishing settings from localStorage:", error);
      return null;
    }
  },

  /**
   * Save fishing settings to localStorage
   */
  set(settings: StoredFishingSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving fishing settings to localStorage:", error);
    }
  },

  /**
   * Get default fishing settings
   */
  getDefault(): StoredFishingSettings {
    return {
      id: "mock-fishing-settings-123",
      waveIntensity: 0.5,
      distortionAmount: 0.3,
      animationSpeed: 1.0,
      backgroundImageUrl: null,
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Initialize storage with default values if empty
   */
  initialize(): StoredFishingSettings {
    const existing = this.get();
    if (existing) {
      return existing;
    }

    const defaultSettings = this.getDefault();
    this.set(defaultSettings);
    return defaultSettings;
  },
};
