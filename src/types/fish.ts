export interface Fish {
  id: string;
  name: string;
  species: "Peixinho Azul" | "Peixinho Verde";
  size: number;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  spawned: boolean;
  spawnTime: Date;
  nextRespawnTime: Date | null;
  x: number; // Posição X onde o peixe foi pescado
  y: number; // Posição Y onde o peixe foi pescado
  inventoryId?: string; // ID no inventário quando pescado
  imageUrl?: string;

  // Estatísticas do peixe específico
  stats: {
    caught: boolean;
    caughtAt?: Date;
    caughtByUserId?: string;
  };
}

export interface FishSpecies {
  name: "Peixinho Azul" | "Peixinho Verde";
  sizeRange: {
    min: number;
    max: number;
  };
  probabilityDistribution: {
    [size: number]: number; // tamanho -> probabilidade
  };
  respawnTime: number; // em milissegundos (15 segundos = 15000)
  rarity: "Common" | "Uncommon" | "Rare";
  baseImageUrl: string;
  description: string;
}

export interface FishingSpot {
  id: string;
  name: string;
  x: number; // Posição normalizada 0-1
  y: number; // Posição normalizada 0-1
  availableFish: Fish[];
  maxFishCount: number;
  spawnCooldown: number; // tempo entre spawns em ms
  lastSpawnTime: Date;
}

export interface FishingGameState {
  spots: FishingSpot[];
  activeFish: Fish[];
  caughtFish: Fish[]; // Peixes no inventário do jogador
  totalCaught: number;
  lastFishCaught: Fish | null;
}

export interface FishDropdownAction {
  id: "inspect" | "feed" | "discard";
  label: string;
  icon: string;
  action: (fish: Fish) => void;
}

export interface FishInspectModal {
  fish: Fish;
  isOpen: boolean;
  onClose: () => void;
  onFeed: (fish: Fish) => void;
  onDiscard: (fish: Fish) => void;
}

// Constantes do sistema de peixes
export const FISH_SPECIES: Record<string, FishSpecies> = {
  "Peixinho Azul": {
    name: "Peixinho Azul",
    sizeRange: { min: 2, max: 6 },
    probabilityDistribution: {
      2: 0.4, // 40% chance tamanho 2
      3: 0.3, // 30% chance tamanho 3
      4: 0.2, // 20% chance tamanho 4
      5: 0.08, // 8% chance tamanho 5
      6: 0.02, // 2% chance tamanho 6
    },
    respawnTime: 15000, // 15 segundos
    rarity: "Common",
    baseImageUrl:
      "https://cdn.builder.io/api/v1/image/assets%2Fc79b00ce148640919b4d22fcf2a41b59%2F2856af704b4e406cb206025a802b3bdc?format=webp&width=800",
    description: "Um peixe azul gracioso que habita águas calmas.",
  },
  "Peixinho Verde": {
    name: "Peixinho Verde",
    sizeRange: { min: 2, max: 4 },
    probabilityDistribution: {
      2: 0.5, // 50% chance tamanho 2
      3: 0.35, // 35% chance tamanho 3
      4: 0.15, // 15% chance tamanho 4
    },
    respawnTime: 15000, // 15 segundos
    rarity: "Common",
    baseImageUrl:
      "https://cdn.builder.io/api/v1/image/assets%2Fae8512d3d0df4d1f8f1504a06406c6ba%2F62141810443b4226b05ad6c4f3dcd94e?format=webp&width=800", // Placeholder - será substituído por imagem verde
    description: "Um pequeno peixe verde ágil que prefere águas rasas.",
  },
};

export const FISH_RESPAWN_TIME = 15000; // 15 segundos em milissegundos

// Funções utilitárias para sistema de peixes
export const generateFishSize = (species: FishSpecies): number => {
  const random = Math.random();
  let accumulator = 0;

  for (const [sizeStr, probability] of Object.entries(
    species.probabilityDistribution,
  )) {
    accumulator += probability;
    if (random <= accumulator) {
      return parseInt(sizeStr);
    }
  }

  // Fallback para o tamanho mínimo
  return species.sizeRange.min;
};

export const calculateFishRarity = (
  species: FishSpecies,
  size: number,
): "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" => {
  const sizeRange = species.sizeRange.max - species.sizeRange.min;
  const sizePercentile = (size - species.sizeRange.min) / sizeRange;

  if (sizePercentile >= 0.9) return "Legendary";
  if (sizePercentile >= 0.7) return "Epic";
  if (sizePercentile >= 0.5) return "Rare";
  if (sizePercentile >= 0.3) return "Uncommon";
  return "Common";
};

export const createFish = (
  species: "Peixinho Azul" | "Peixinho Verde",
  x: number,
  y: number,
): Fish => {
  const speciesData = FISH_SPECIES[species];
  const size = generateFishSize(speciesData);
  const rarity = calculateFishRarity(speciesData, size);

  return {
    id: `fish_${species.replace(" ", "_").toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${species} (Tamanho ${size})`,
    species,
    size,
    rarity,
    spawned: true,
    spawnTime: new Date(),
    nextRespawnTime: null,
    x,
    y,
    imageUrl: speciesData.baseImageUrl,
    stats: {
      caught: false,
    },
  };
};
