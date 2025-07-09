import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ExplorationPoint, ExplorationArea } from "../types/game";
import { gameService } from "../services/gameService";

interface ExplorationState {
  // Current exploration context
  currentExplorationPoint: ExplorationPoint | null;
  currentExplorationArea: ExplorationArea | null;
  explorationPoints: ExplorationPoint[];

  // Planet context
  currentPlanet: { id: string; name: string; color: string } | null;

  // Edit mode (admin only)
  isPlanetEditMode: boolean;
}

interface ExplorationStore extends ExplorationState {
  // Planet management
  setCurrentPlanet: (
    planet: { id: string; name: string; color: string } | null,
  ) => void;

  // Exploration point management
  setCurrentExplorationPoint: (point: ExplorationPoint | null) => void;
  setCurrentExplorationArea: (area: ExplorationArea | null) => void;
  generateExplorationPoints: (planetId: string) => ExplorationPoint[];
  getExplorationArea: (pointId: string) => ExplorationArea;

  // Admin editing functions
  setPlanetEditMode: (enabled: boolean) => void;
  updateExplorationPoint: (
    pointId: string,
    updates: Partial<ExplorationPoint>,
  ) => void;
  toggleExplorationPointActive: (pointId: string) => void;
  addExplorationPoint: (
    planetId: string,
    x: number,
    y: number,
  ) => ExplorationPoint;
  removeExplorationPoint: (pointId: string) => void;
  saveExplorationPoints: (planetId: string) => Promise<boolean>;
  loadExplorationPointsFromStorage: (
    planetId: string,
  ) => ExplorationPoint[] | null;
}

// Deterministic random number generator for consistent exploration points
function seededRandom(seed: number): () => number {
  let x = Math.sin(seed) * 10000;
  return function () {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

export const useExplorationStore = create<ExplorationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentExplorationPoint: null,
      currentExplorationArea: null,
      explorationPoints: [],
      currentPlanet: null,
      isPlanetEditMode: false,

      // Planet management
      setCurrentPlanet: (planet) => set({ currentPlanet: planet }),

      // Exploration point management
      setCurrentExplorationPoint: (point) =>
        set({ currentExplorationPoint: point }),
      setCurrentExplorationArea: (area) =>
        set({ currentExplorationArea: area }),

      generateExplorationPoints: (planetId: string) => {
        const rng = seededRandom(
          planetId.split("").reduce((a, b) => a + b.charCodeAt(0), 0),
        );

        const pointNames = [
          "Crystal Caves",
          "Ancient Ruins",
          "Toxic Swamps",
          "Floating Gardens",
          "Volcanic Peaks",
          "Ice Fields",
          "Desert Oasis",
          "Forest Temple",
          "Underground City",
          "Sky Harbor",
          "Mystic Grove",
          "Robot Factory",
        ];

        const points: ExplorationPoint[] = [];
        const numPoints = 5;

        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI + rng() * 0.5;
          const radius = 80 + rng() * 60;

          points.push({
            id: `${planetId}-point-${i}`,
            planetId,
            name: pointNames[Math.floor(rng() * pointNames.length)],
            x: 200 + Math.cos(angle) * radius,
            y: 200 + Math.sin(angle) * radius,
            discovered: false,
            rewards: [],
            description: `An unexplored area on planet ${planetId}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        set({ explorationPoints: points });
        return points;
      },

      getExplorationArea: (pointId: string): ExplorationArea => {
        const point = get().explorationPoints.find((p) => p.id === pointId);
        if (!point) {
          throw new Error(`Exploration point ${pointId} not found`);
        }

        // Generate deterministic area based on point ID
        const seed = pointId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        const rng = seededRandom(seed);

        const areaTypes = [
          { type: "forest", image: "/images/areas/forest.jpg" },
          { type: "desert", image: "/images/areas/desert.jpg" },
          { type: "mountain", image: "/images/areas/mountain.jpg" },
          { type: "ocean", image: "/images/areas/ocean.jpg" },
          { type: "cave", image: "/images/areas/cave.jpg" },
        ];

        const selectedArea = areaTypes[Math.floor(rng() * areaTypes.length)];

        return {
          id: `area-${pointId}`,
          pointId,
          name: point.name,
          description: `Detailed exploration of ${point.name}`,
          type: selectedArea.type,
          imageUrl: selectedArea.image,
          discoveries: [],
          rewards: point.rewards,
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },

      // Admin editing functions
      setPlanetEditMode: (enabled) => set({ isPlanetEditMode: enabled }),

      updateExplorationPoint: (pointId, updates) => {
        set((state) => ({
          explorationPoints: state.explorationPoints.map((point) =>
            point.id === pointId
              ? { ...point, ...updates, updatedAt: new Date() }
              : point,
          ),
        }));
      },

      toggleExplorationPointActive: (pointId) => {
        get().updateExplorationPoint(pointId, {
          isActive: !get().explorationPoints.find((p) => p.id === pointId)
            ?.isActive,
        });
      },

      addExplorationPoint: (planetId, x, y) => {
        const newPoint: ExplorationPoint = {
          id: `${planetId}-point-${Date.now()}`,
          planetId,
          name: "New Point",
          x,
          y,
          discovered: false,
          rewards: [],
          description: "A newly discovered area",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          explorationPoints: [...state.explorationPoints, newPoint],
        }));

        return newPoint;
      },

      removeExplorationPoint: (pointId) => {
        set((state) => ({
          explorationPoints: state.explorationPoints.filter(
            (point) => point.id !== pointId,
          ),
        }));
      },

      saveExplorationPoints: async (planetId) => {
        try {
          const points = get().explorationPoints.filter(
            (point) => point.planetId === planetId,
          );
          await gameService.saveExplorationPoints(planetId, points);
          return true;
        } catch (error) {
          console.error("Failed to save exploration points:", error);
          return false;
        }
      },

      loadExplorationPointsFromStorage: (planetId) => {
        // This would load from local storage or server
        // For now, return null to use generated points
        return null;
      },
    }),
    {
      name: "exploration-storage",
      partialize: (state) => ({
        explorationPoints: state.explorationPoints,
      }),
    },
  ),
);
