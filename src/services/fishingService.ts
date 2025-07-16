import {
  Fish,
  FishSpecies,
  FISH_SPECIES,
  createFish,
  FISH_RESPAWN_TIME,
} from "../types/fish";
import { Item } from "../types/game";

class FishingService {
  private activeFish: Map<string, Fish> = new Map();
  private respawnTimers: Map<string, NodeJS.Timeout> = new Map();
  private fishingSpots: Array<{
    x: number;
    y: number;
    species: "Peixinho Azul" | "Peixinho Verde";
  }> = [];

  constructor() {
    this.initializeFishingSpots();
  }

  private initializeFishingSpots() {
    // Definir spots de pesca específicos na área de água
    // Área de água: y > 0.6 (60% da tela de baixo para cima)
    this.fishingSpots = [
      // Peixinho Azul - spots mais profundos
      { x: 0.2, y: 0.7, species: "Peixinho Azul" },
      { x: 0.8, y: 0.75, species: "Peixinho Azul" },

      // Peixinho Verde - spots mais rasos
      { x: 0.5, y: 0.6, species: "Peixinho Verde" },
    ];

    // Não spawnar peixes automaticamente - será feito manualmente
  }

  private spawnInitialFish() {
    // Spawnar um peixe de cada espécie inicialmente
    this.fishingSpots.forEach((spot, index) => {
      // Pequeno delay para distribuir os spawns
      setTimeout(() => {
        this.spawnFishAtSpot(spot);
      }, index * 1000);
    });
  }

  private spawnFishAtSpot(spot: {
    x: number;
    y: number;
    species: "Peixinho Azul" | "Peixinho Verde";
  }) {
    // Verificar se já existe peixe neste spot
    const existingFish = Array.from(this.activeFish.values()).find(
      (fish) =>
        Math.abs(fish.x - spot.x) < 0.1 && Math.abs(fish.y - spot.y) < 0.1,
    );

    if (existingFish) {
      console.log(`Fish already exists at spot ${spot.x}, ${spot.y}`);
      return;
    }

    // Criar novo peixe
    const newFish = createFish(spot.species, spot.x, spot.y);
    this.activeFish.set(newFish.id, newFish);

    console.log(
      `🐟 Spawned ${newFish.species} (size ${newFish.size}) at position (${spot.x}, ${spot.y})`,
    );
  }

  public getActiveFish(): Fish[] {
    return Array.from(this.activeFish.values());
  }

  public getFishNearPosition(
    x: number,
    y: number,
    radius: number = 0.05,
  ): Fish | null {
    for (const fish of this.activeFish.values()) {
      const distance = Math.sqrt(
        Math.pow(fish.x - x, 2) + Math.pow(fish.y - y, 2),
      );
      if (distance <= radius) {
        return fish;
      }
    }
    return null;
  }

  public catchFish(fishId: string, userId: string): Fish | null {
    const fish = this.activeFish.get(fishId);
    if (!fish || fish.stats.caught) {
      return null;
    }

    // Marcar peixe como pescado
    fish.stats.caught = true;
    fish.stats.caughtAt = new Date();
    fish.stats.caughtByUserId = userId;

    // Remover da lista de peixes ativos
    this.activeFish.delete(fishId);

    console.log(`🎣 Fish ${fish.name} caught by user ${userId}`);

    // Programar respawn do mesmo tipo de peixe
    this.scheduleRespawn(fish);

    return fish;
  }

  private scheduleRespawn(caughtFish: Fish) {
    const respawnKey = `${caughtFish.species}_${caughtFish.x}_${caughtFish.y}`;

    // Limpar timer existente se houver
    const existingTimer = this.respawnTimers.get(respawnKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Criar novo timer para respawn
    const timer = setTimeout(() => {
      // Encontrar o spot original
      const originalSpot = this.fishingSpots.find(
        (spot) =>
          Math.abs(spot.x - caughtFish.x) < 0.05 &&
          Math.abs(spot.y - caughtFish.y) < 0.05 &&
          spot.species === caughtFish.species,
      );

      if (originalSpot) {
        this.spawnFishAtSpot(originalSpot);
      }

      // Remover timer da lista
      this.respawnTimers.delete(respawnKey);
    }, FISH_RESPAWN_TIME);

    this.respawnTimers.set(respawnKey, timer);

    console.log(
      `⏰ Scheduled respawn for ${caughtFish.species} in ${FISH_RESPAWN_TIME / 1000} seconds`,
    );
  }

  public convertFishToItem(fish: Fish): Item {
    const now = new Date();

    return {
      id: `fish_item_${fish.id}`,
      slug: `${fish.species.toLowerCase().replace(" ", "-")}-size-${fish.size}`,
      name: fish.name,
      description: `${FISH_SPECIES[fish.species].description} Tamanho: ${fish.size}`,
      type: "Fish" as const,
      rarity: fish.rarity,
      quantity: 1,
      imageUrl: fish.imageUrl,
      createdAt: now,
      fishData: {
        species: fish.species,
        size: fish.size,
        caughtAt: fish.stats.caughtAt || now,
        caughtPosition: { x: fish.x, y: fish.y },
      },
    };
  }

  public feedFish(fishItem: Item): { success: boolean; message: string } {
    if (fishItem.type !== "Fish" || !fishItem.fishData) {
      return { success: false, message: "Este item não é um peixe válido." };
    }

    // Lógica de alimentar o peixe
    // Por enquanto, só retorna uma mensagem
    return {
      success: true,
      message: `Você alimentou ${fishItem.name}! O peixe parece feliz e saudável.`,
    };
  }

  public inspectFish(fishItem: Item): {
    success: boolean;
    data?: any;
    message: string;
  } {
    if (fishItem.type !== "Fish" || !fishItem.fishData) {
      return { success: false, message: "Este item não é um peixe válido." };
    }

    const inspectionData = {
      name: fishItem.name,
      species: fishItem.fishData.species,
      size: fishItem.fishData.size,
      rarity: fishItem.rarity,
      caughtAt: fishItem.fishData.caughtAt,
      caughtPosition: fishItem.fishData.caughtPosition,
      description: fishItem.description,
      speciesInfo: FISH_SPECIES[fishItem.fishData.species],
    };

    return {
      success: true,
      data: inspectionData,
      message: "Informações do peixe carregadas com sucesso.",
    };
  }

  public getAllFishingSpots() {
    return this.fishingSpots;
  }

  public cleanup() {
    // Limpar todos os timers
    this.respawnTimers.forEach((timer) => clearTimeout(timer));
    this.respawnTimers.clear();
    this.activeFish.clear();
  }

  // Método para forçar respawn de todos os peixes (útil para debugging)
  public forceRespawnAll() {
    console.log(
      "🔄 Force respawning all fish - clearing existing fish and timers",
    );

    // Limpar todos os peixes ativos
    this.activeFish.clear();

    // Limpar todos os timers de respawn
    this.respawnTimers.forEach((timer) => clearTimeout(timer));
    this.respawnTimers.clear();

    console.log("🔄 Spawning exactly 3 fish...");

    // Spawnar exatamente 3 peixes
    this.fishingSpots.forEach((spot) => {
      const newFish = createFish(spot.species, spot.x, spot.y);
      this.activeFish.set(newFish.id, newFish);
      console.log(`🐟 Spawned ${newFish.species} at (${spot.x}, ${spot.y})`);
    });

    console.log(
      "🔄 Force respawn completed, active fish:",
      this.getActiveFish().length,
    );
  }

  // Método para obter estatísticas de pesca
  public getFishingStats() {
    return {
      activeFishCount: this.activeFish.size,
      respawnTimersCount: this.respawnTimers.size,
      fishingSpots: this.fishingSpots.length,
      activeFishBySpecies: {
        "Peixinho Azul": Array.from(this.activeFish.values()).filter(
          (f) => f.species === "Peixinho Azul",
        ).length,
        "Peixinho Verde": Array.from(this.activeFish.values()).filter(
          (f) => f.species === "Peixinho Verde",
        ).length,
      },
    };
  }
}

// Singleton instance
export const fishingService = new FishingService();
