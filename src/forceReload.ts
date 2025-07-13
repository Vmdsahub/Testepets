// Script temporário para forçar o reload das world positions
import { useGameStore } from "./store/gameStore";

// Executar ao carregar a página
if (typeof window !== "undefined") {
  // Aguarda um pouco e força o reload
  setTimeout(() => {
    const store = useGameStore.getState();
    console.log("🔄 Forçando reload das world positions...");
    store.forceReloadWorldPositions();
  }, 1000);
}
