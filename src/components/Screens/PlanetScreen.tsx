import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Star,
  MapPin,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
  Eye,
  EyeOff,
} from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { ExplorationPoint } from "../../types/game";

interface Planet {
  id: string;
  name: string;
  color: string;
}

export const PlanetScreen: React.FC = () => {
  const {
    currentPlanet,
    setCurrentScreen,
    explorationPoints,
    generateExplorationPoints,
    setCurrentExplorationPoint,
    user,
    isPlanetEditMode,
    setPlanetEditMode,
    updateExplorationPoint,
    toggleExplorationPointActive,
  } = useGameStore();

  const [draggedPoint, setDraggedPoint] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!currentPlanet) {
    return null;
  }

  // Generate exploration points for this planet
  useEffect(() => {
    if (currentPlanet) {
      generateExplorationPoints(currentPlanet.id);
    }
  }, [currentPlanet.id, generateExplorationPoints]);

  // Handle exploration point click
  const handleExplorationPointClick = (point: ExplorationPoint) => {
    if (isPlanetEditMode) return; // Don't navigate in edit mode
    setCurrentExplorationPoint(point);
    setCurrentScreen("exploration");
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, point: ExplorationPoint) => {
    if (!isPlanetEditMode || !user?.isAdmin) return;

    e.preventDefault();
    setDraggedPoint(point.id);

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const pointX = (point.x / 100) * rect.width;
      const pointY = (point.y / 100) * rect.height;

      setDragOffset({
        x: e.clientX - rect.left - pointX,
        y: e.clientY - rect.top - pointY,
      });
    }
  };

  // Handle drag
  const handleDrag = (e: React.MouseEvent) => {
    if (!draggedPoint || !containerRef.current) return;

    e.preventDefault();
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    // Clamp to container bounds
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    updateExplorationPoint(draggedPoint, { x: clampedX, y: clampedY });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedPoint(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Handle size change
  const handleSizeChange = (pointId: string, delta: number) => {
    const point = explorationPoints.find((p) => p.id === pointId);
    if (point) {
      const newSize = Math.max(0.5, Math.min(2.0, (point.size || 1.0) + delta));
      updateExplorationPoint(pointId, { size: newSize });
    }
  };

  // Handle toggle active
  const handleToggleActive = (pointId: string) => {
    toggleExplorationPointActive(pointId);
  };

  // Gerar uma imagem placeholder baseada na cor do planeta
  const generatePlanetImage = (color: string) => {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Cdefs%3E%3CradialGradient id='planet' cx='40%25' cy='40%25'%3E%3Cstop offset='0%25' stop-color='${encodeURIComponent(color)}' stop-opacity='1'/%3E%3Cstop offset='70%25' stop-color='${encodeURIComponent(color)}' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%23000' stop-opacity='0.6'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='%23000011'/%3E%3Ccircle cx='400' cy='300' r='200' fill='url(%23planet)' /%3E%3Ccircle cx='350' cy='250' r='15' fill='%23ffffff' fill-opacity='0.3'/%3E%3Ccircle cx='420' cy='320' r='10' fill='%23ffffff' fill-opacity='0.2'/%3E%3Ccircle cx='450' cy='280' r='8' fill='%23ffffff' fill-opacity='0.4'/%3E%3C/svg%3E`;
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="bg-white rounded-3xl shadow-xl p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {currentPlanet.name}
        </h1>
        <div className="w-full h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-340px)] relative rounded-2xl overflow-hidden">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            src={generatePlanetImage(currentPlanet.color)}
            alt={`Superfície de ${currentPlanet.name}`}
            className="w-full h-full object-cover"
          />

          {/* Exploration Points */}
          {explorationPoints
            .filter((point) => point.planetId === currentPlanet.id)
            .map((point, index) => (
              <motion.button
                key={point.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.2, duration: 0.4 }}
                onClick={() => handleExplorationPointClick(point)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                {/* Main point */}
                <div className="relative w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-white" />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black bg-opacity-80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  {point.name}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-opacity-80"></div>
                </div>
              </motion.button>
            ))}
        </div>

        <div className="flex justify-center mt-4">
          <motion.button
            onClick={() => setCurrentScreen("world")}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
