import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Item, RedeemCode } from "../types/game";
import { gameService } from "../services/gameService";

interface StoreState {
  // Store items and pricing
  storeItems: Item[];

  // Redeem codes
  redeemedCodes: RedeemCode[];

  // Loading states
  isLoadingStore: boolean;
  isRedeemingCode: boolean;
}

interface StoreStore extends StoreState {
  // Store management
  loadStoreItems: () => Promise<void>;
  purchaseItem: (itemId: string, quantity?: number) => Promise<boolean>;

  // Redeem code management
  redeemCode: (code: string) => Promise<{ success: boolean; message: string }>;
  loadRedeemedCodes: () => Promise<void>;

  // Internal helpers
  setStoreItems: (items: Item[]) => void;
  setIsLoadingStore: (loading: boolean) => void;
  setIsRedeemingCode: (redeeming: boolean) => void;
  addRedeemedCode: (code: RedeemCode) => void;
}

export const useStoreStore = create<StoreStore>()(
  persist(
    (set, get) => ({
      // Initial state
      storeItems: [],
      redeemedCodes: [],
      isLoadingStore: false,
      isRedeemingCode: false,

      // Store management
      loadStoreItems: async () => {
        const { setIsLoadingStore, setStoreItems } = get();
        setIsLoadingStore(true);

        try {
          const items = await gameService.getStoreItems();
          setStoreItems(items);
        } catch (error) {
          console.error("Failed to load store items:", error);
        } finally {
          setIsLoadingStore(false);
        }
      },

      purchaseItem: async (itemId: string, quantity = 1) => {
        try {
          const result = await gameService.purchaseItem(itemId, quantity);
          return result;
        } catch (error) {
          console.error("Failed to purchase item:", error);
          return false;
        }
      },

      // Redeem code management
      redeemCode: async (code: string) => {
        const { setIsRedeemingCode, addRedeemedCode } = get();
        setIsRedeemingCode(true);

        try {
          const result = await gameService.redeemCode(code);

          if (result.success && result.redeemedCode) {
            addRedeemedCode(result.redeemedCode);
          }

          return { success: result.success, message: result.message };
        } catch (error) {
          console.error("Failed to redeem code:", error);
          return { success: false, message: "Erro interno do servidor" };
        } finally {
          setIsRedeemingCode(false);
        }
      },

      loadRedeemedCodes: async () => {
        try {
          const codes = await gameService.getRedeemedCodes();
          set({ redeemedCodes: codes });
        } catch (error) {
          console.error("Failed to load redeemed codes:", error);
        }
      },

      // Setters
      setStoreItems: (items) => set({ storeItems: items }),
      setIsLoadingStore: (loading) => set({ isLoadingStore: loading }),
      setIsRedeemingCode: (redeeming) => set({ isRedeemingCode: redeeming }),
      addRedeemedCode: (code) =>
        set((state) => ({
          redeemedCodes: [...state.redeemedCodes, code],
        })),
    }),
    {
      name: "store-storage",
      partialize: (state) => ({
        redeemedCodes: state.redeemedCodes,
      }),
    },
  ),
);
