// Script temporário para forçar o reload das world positions
import { useGameStore } from "./store/gameStore";

// Executar ao carregar a página
if (typeof window !== "undefined") {
  // Aguarda um pouco e força o reload
  setTimeout(() => {
    const store = useGameStore.getState();
    console.log("🔄 Forçando reload das world positions...");
    store.forceReloadWorldPositions();

    // Remove este script após 5 segundos
    setTimeout(() => {
      console.log("🔄 Reload das world positions concluído");
    }, 5000);
  }, 1000);
}
