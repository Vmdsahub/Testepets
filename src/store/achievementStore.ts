import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Achievement, Collectible } from "../types/game";
import { gameService } from "../services/gameService";

interface AchievementState {
  // User achievements and collectibles
  achievements: Achievement[];
  collectibles: Collectible[];

  // Other user data (for viewing other profiles)
  otherUserAchievements: Achievement[];
  otherUserCollectibles: Collectible[];

  // Loading states
  isLoadingAchievements: boolean;
  isLoadingCollectibles: boolean;
}

interface AchievementStore extends AchievementState {
  // Achievement management
  loadUserAchievements: (userId?: string) => Promise<void>;
  unlockAchievement: (achievementId: string) => Promise<boolean>;
  checkAchievementProgress: (type: string, value: number) => Promise<void>;

  // Collectible management
  loadUserCollectibles: (userId?: string) => Promise<void>;
  addCollectible: (collectibleId: string) => Promise<boolean>;

  // Other user data
  loadOtherUserAchievements: (userId: string) => Promise<void>;
  loadOtherUserCollectibles: (userId: string) => Promise<void>;
  clearOtherUserData: () => void;

  // Internal setters
  setAchievements: (achievements: Achievement[]) => void;
  setCollectibles: (collectibles: Collectible[]) => void;
  setOtherUserAchievements: (achievements: Achievement[]) => void;
  setOtherUserCollectibles: (collectibles: Collectible[]) => void;
  setIsLoadingAchievements: (loading: boolean) => void;
  setIsLoadingCollectibles: (loading: boolean) => void;
}

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      // Initial state
      achievements: [],
      collectibles: [],
      otherUserAchievements: [],
      otherUserCollectibles: [],
      isLoadingAchievements: false,
      isLoadingCollectibles: false,

      // Achievement management
      loadUserAchievements: async (userId) => {
        const { setIsLoadingAchievements, setAchievements } = get();
        setIsLoadingAchievements(true);

        try {
          const achievements = await gameService.getUserAchievements(userId);
          setAchievements(achievements);
        } catch (error) {
          console.error("Failed to load achievements:", error);
        } finally {
          setIsLoadingAchievements(false);
        }
      },

      unlockAchievement: async (achievementId: string) => {
        try {
          const result = await gameService.unlockAchievement(achievementId);

          if (result) {
            // Reload achievements to get updated data
            await get().loadUserAchievements();
          }

          return result;
        } catch (error) {
          console.error("Failed to unlock achievement:", error);
          return false;
        }
      },

      checkAchievementProgress: async (type: string, value: number) => {
        try {
          await gameService.checkAchievementProgress(type, value);
          // Optionally reload achievements if progress was made
        } catch (error) {
          console.error("Failed to check achievement progress:", error);
        }
      },

      // Collectible management
      loadUserCollectibles: async (userId) => {
        const { setIsLoadingCollectibles, setCollectibles } = get();
        setIsLoadingCollectibles(true);

        try {
          const collectibles = await gameService.getUserCollectibles(userId);
          setCollectibles(collectibles);
        } catch (error) {
          console.error("Failed to load collectibles:", error);
        } finally {
          setIsLoadingCollectibles(false);
        }
      },

      addCollectible: async (collectibleId: string) => {
        try {
          const result = await gameService.addCollectible(collectibleId);

          if (result) {
            // Reload collectibles to get updated data
            await get().loadUserCollectibles();
          }

          return result;
        } catch (error) {
          console.error("Failed to add collectible:", error);
          return false;
        }
      },

      // Other user data
      loadOtherUserAchievements: async (userId: string) => {
        const { setOtherUserAchievements } = get();

        try {
          const achievements = await gameService.getUserAchievements(userId);
          setOtherUserAchievements(achievements);
        } catch (error) {
          console.error("Failed to load other user achievements:", error);
        }
      },

      loadOtherUserCollectibles: async (userId: string) => {
        const { setOtherUserCollectibles } = get();

        try {
          const collectibles = await gameService.getUserCollectibles(userId);
          setOtherUserCollectibles(collectibles);
        } catch (error) {
          console.error("Failed to load other user collectibles:", error);
        }
      },

      clearOtherUserData: () => {
        set({
          otherUserAchievements: [],
          otherUserCollectibles: [],
        });
      },

      // Setters
      setAchievements: (achievements) => set({ achievements }),
      setCollectibles: (collectibles) => set({ collectibles }),
      setOtherUserAchievements: (achievements) =>
        set({ otherUserAchievements: achievements }),
      setOtherUserCollectibles: (collectibles) =>
        set({ otherUserCollectibles: collectibles }),
      setIsLoadingAchievements: (loading) =>
        set({ isLoadingAchievements: loading }),
      setIsLoadingCollectibles: (loading) =>
        set({ isLoadingCollectibles: loading }),
    }),
    {
      name: "achievement-storage",
      partialize: (state) => ({
        achievements: state.achievements,
        collectibles: state.collectibles,
      }),
    },
  ),
);
