// Arquivo de teste temporário para o sistema de peixes
// Este arquivo pode ser removido após os testes

import { fishingService } from "./services/fishingService";
import { FISH_SPECIES, createFish } from "./types/fish";

// Teste básico do sistema de peixes
console.log("🧪 Testing Fish System...");

// Teste 1: Verificar espécies disponíveis
console.log("Available fish species:", Object.keys(FISH_SPECIES));

// Teste 2: Criar peixes de teste
const testBlueFish = createFish("Peixinho Azul", 0.5, 0.8);
const testGreenFish = createFish("Peixinho Verde", 0.3, 0.7);

console.log("Test blue fish:", testBlueFish);
console.log("Test green fish:", testGreenFish);

// Teste 3: Verificar estatísticas do fishing service
console.log("Fishing service stats:", fishingService.getFishingStats());

// Teste 4: Testar conversão para item
const fishItem = fishingService.convertFishToItem(testBlueFish);
console.log("Fish converted to item:", fishItem);

// Teste 5: Testar funções de peixe
const feedResult = fishingService.feedFish(fishItem);
console.log("Feed fish result:", feedResult);

const inspectResult = fishingService.inspectFish(fishItem);
console.log("Inspect fish result:", inspectResult);

console.log("✅ Fish System tests completed!");
