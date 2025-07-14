import { supabase, isMockMode } from "../lib/supabase";
import { fishingSettingsStorage } from "../utils/fishingSettingsStorage";

export interface FishingSettings {
  id: string;
  waveIntensity: number;
  distortionAmount: number;
  animationSpeed: number;
  backgroundImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface FishingSettingsUpdate {
  waveIntensity?: number;
  distortionAmount?: number;
  animationSpeed?: number;
  backgroundImageUrl?: string | null;
}

class FishingSettingsService {
  /**
   * Get current fishing settings
   */
  async getFishingSettings(): Promise<FishingSettings | null> {
    try {
      // Use local storage in mock mode for persistence
      if (isMockMode) {
        const stored = fishingSettingsStorage.initialize();
        return {
          id: stored.id,
          waveIntensity: stored.waveIntensity,
          distortionAmount: stored.distortionAmount,
          animationSpeed: stored.animationSpeed,
          backgroundImageUrl: stored.backgroundImageUrl,
          createdAt: new Date(),
          updatedAt: new Date(stored.updatedAt),
          updatedBy: null,
        };
      }

      const { data, error } = await supabase
        .from("fishing_settings")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching fishing settings:", error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        waveIntensity: parseFloat(data.wave_intensity),
        distortionAmount: parseFloat(data.distortion_amount),
        animationSpeed: parseFloat(data.animation_speed),
        backgroundImageUrl: data.background_image_url,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        updatedBy: data.updated_by,
      };
    } catch (error) {
      console.error("Error in getFishingSettings:", error);
      return null;
    }
  }

  /**
   * Update fishing settings (admin only)
   */
  async updateFishingSettings(
    updates: FishingSettingsUpdate,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Use local storage in mock mode for persistence
      if (isMockMode) {
        const current =
          fishingSettingsStorage.get() || fishingSettingsStorage.getDefault();

        // Update only the fields that are provided
        const updated = {
          ...current,
          ...(updates.waveIntensity !== undefined && {
            waveIntensity: updates.waveIntensity,
          }),
          ...(updates.distortionAmount !== undefined && {
            distortionAmount: updates.distortionAmount,
          }),
          ...(updates.animationSpeed !== undefined && {
            animationSpeed: updates.animationSpeed,
          }),
          ...(updates.backgroundImageUrl !== undefined && {
            backgroundImageUrl: updates.backgroundImageUrl,
          }),
          updatedAt: new Date().toISOString(),
        };

        fishingSettingsStorage.set(updated);
        return { success: true };
      }

      // Convert camelCase to snake_case for database
      const dbUpdates: any = {};

      if (updates.waveIntensity !== undefined) {
        dbUpdates.wave_intensity = updates.waveIntensity;
      }
      if (updates.distortionAmount !== undefined) {
        dbUpdates.distortion_amount = updates.distortionAmount;
      }
      if (updates.animationSpeed !== undefined) {
        dbUpdates.animation_speed = updates.animationSpeed;
      }
      if (updates.backgroundImageUrl !== undefined) {
        dbUpdates.background_image_url = updates.backgroundImageUrl;
      }

      const currentSettings = await this.getFishingSettings();

      const { error } = await supabase
        .from("fishing_settings")
        .update(dbUpdates)
        .eq("id", currentSettings?.id);

      if (error) {
        console.error("Error updating fishing settings:", error);
        return {
          success: false,
          message: "Failed to update fishing settings",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in updateFishingSettings:", error);
      return {
        success: false,
        message: "An unexpected error occurred",
      };
    }
  }

  /**
   * Subscribe to fishing settings changes in real-time
   */
  subscribeToFishingSettings(
    callback: (settings: FishingSettings | null) => void,
  ) {
    // For now, return a simple unsubscribe function to avoid issues
    // Real-time updates can be added later once the subscription API is working
    return {
      unsubscribe: () => {
        // No-op for now
      },
    };
  }

  /**
   * Upload background image and update settings
   */
  async uploadBackgroundImage(
    file: File,
  ): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
    try {
      // Check if storage is available
      if (!supabase.storage || isMockMode) {
        console.warn(
          "Storage not available in mock mode - converting to data URL",
        );

        // Convert file to data URL for persistence in mock mode
        const dataURL = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        // Update fishing settings with data URL
        const updateResult = await this.updateFishingSettings({
          backgroundImageUrl: dataURL,
        });

        if (!updateResult.success) {
          return {
            success: false,
            message: "Failed to update settings with uploaded image",
          };
        }

        return {
          success: true,
          imageUrl: dataURL,
        };
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `fishing-background-${Date.now()}.${fileExt}`;
      const filePath = `fishing/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("game-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading background image:", uploadError);
        return {
          success: false,
          message: "Failed to upload image",
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("game-assets")
        .getPublicUrl(uploadData.path);

      const imageUrl = urlData.publicUrl;

      // Update fishing settings with new background URL
      const updateResult = await this.updateFishingSettings({
        backgroundImageUrl: imageUrl,
      });

      if (!updateResult.success) {
        return {
          success: false,
          message: "Image uploaded but failed to update settings",
        };
      }

      return {
        success: true,
        imageUrl,
      };
    } catch (error) {
      console.error("Error in uploadBackgroundImage:", error);
      return {
        success: false,
        message: "An unexpected error occurred",
      };
    }
  }
}

export const fishingSettingsService = new FishingSettingsService();
