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
  Trash2,
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
    addExplorationPoint,
    removeExplorationPoint,
    saveExplorationPoints,
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
      const currentSize = point.size || 1.0;
      const newSize = Math.max(0.5, Math.min(2.0, currentSize + delta));
      console.log(
        `Changing size from ${currentSize} to ${newSize} for point ${pointId}`,
      );
      updateExplorationPoint(pointId, { size: newSize });
    }
  };

  // Handle toggle active
  const handleToggleActive = (pointId: string) => {
    console.log(`Toggling active state for point ${pointId}`);
    toggleExplorationPointActive(pointId);
  };

  // Handle delete point
  const handleDeletePoint = (pointId: string) => {
    if (confirm("Tem certeza que deseja excluir este ponto de exploração?")) {
      removeExplorationPoint(pointId);
    }
  };

  // Handle add new point
  const handleAddPoint = (e: React.MouseEvent) => {
    if (!isPlanetEditMode || !currentPlanet) return;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Clamp to container bounds
      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      addExplorationPoint(currentPlanet.id, clampedX, clampedY);
    }
  };

  // Handle save changes
  const handleSave = async () => {
    if (currentPlanet) {
      await saveExplorationPoints(currentPlanet.id);
      setPlanetEditMode(false);
    }
  };

  // Gerar uma imagem placeholder baseada na cor do planeta
  const generatePlanetImage = (color: string) => {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Cdefs%3E%3CradialGradient id='planet' cx='40%25' cy='40%25'%3E%3Cstop offset='0%25' stop-color='${encodeURIComponent(color)}' stop-opacity='1'/%3E%3Cstop offset='70%25' stop-color='${encodeURIComponent(color)}' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%23000' stop-opacity='0.6'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='%23000011'/%3E%3Ccircle cx='400' cy='300' r='200' fill='url(%23planet)' /%3E%3Ccircle cx='350' cy='250' r='15' fill='%23ffffff' fill-opacity='0.3'/%3E%3Ccircle cx='420' cy='320' r='10' fill='%23ffffff' fill-opacity='0.2'/%3E%3Ccircle cx='450' cy='280' r='8' fill='%23ffffff' fill-opacity='0.4'/%3E%3C/svg%3E`;
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="bg-white rounded-3xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center flex-1">
            {currentPlanet.name}
          </h1>

          {/* Admin Edit Button */}
          {user?.isAdmin && (
            <motion.button
              onClick={
                isPlanetEditMode ? handleSave : () => setPlanetEditMode(true)
              }
              className={`p-2 rounded-full transition-colors ${
                isPlanetEditMode
                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isPlanetEditMode ? (
                <Save className="w-5 h-5" />
              ) : (
                <Edit3 className="w-5 h-5" />
              )}
            </motion.button>
          )}
        </div>
        <div
          ref={containerRef}
          className={`w-full h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-340px)] relative rounded-2xl overflow-hidden ${
            isPlanetEditMode
              ? "border-2 border-dashed border-blue-400 bg-blue-50/20 cursor-crosshair"
              : ""
          }`}
          onMouseMove={handleDrag}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onClick={isPlanetEditMode ? handleAddPoint : undefined}
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            src={generatePlanetImage(currentPlanet.color)}
            alt={`Superfície de ${currentPlanet.name}`}
            className="w-full h-full object-cover"
          />

          {/* Edit mode overlay */}
          {isPlanetEditMode && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Modo de Edição
            </div>
          )}

          {/* Exploration Points */}
          {explorationPoints
            .filter((point) => point.planetId === currentPlanet.id)
            .filter((point) => isPlanetEditMode || point.active !== false) // Show all in edit mode, only active in normal mode
            .map((point, index) => {
              const size = point.size || 1.0;
              const isActive = point.active !== false;
              const isDragging = draggedPoint === point.id;

              return (
                <div
                  key={point.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                  }}
                >
                  {/* Main exploration point */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: isPlanetEditMode ? (isActive ? 1 : 0.5) : 1,
                      scale: size,
                    }}
                    transition={{ delay: 0.8 + index * 0.2, duration: 0.4 }}
                    onClick={() => handleExplorationPointClick(point)}
                    onMouseDown={(e) => handleDragStart(e, point)}
                    className={`group relative ${isPlanetEditMode ? "cursor-move" : "cursor-pointer"} ${
                      isDragging ? "z-50" : ""
                    }`}
                    whileHover={!isPlanetEditMode ? { scale: size * 1.2 } : {}}
                    whileTap={!isPlanetEditMode ? { scale: size * 0.9 } : {}}
                    style={{
                      transform: isDragging ? "scale(1.1)" : undefined,
                    }}
                  >
                    {/* Main point */}
                    <div
                      className={`relative w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                        isActive ? "bg-blue-500" : "bg-gray-400"
                      } ${isPlanetEditMode ? "ring-2 ring-blue-300" : ""}`}
                    >
                      <MapPin className="w-3 h-3 text-white" />
                    </div>

                    {/* Tooltip */}
                    {!isPlanetEditMode && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black bg-opacity-80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        {point.name}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-opacity-80"></div>
                      </div>
                    )}
                  </motion.button>

                  {/* Edit controls */}
                  {isPlanetEditMode && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-50">
                      {/* Size controls */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSizeChange(point.id, -0.1);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Diminuir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="text-xs font-mono px-1 min-w-[32px] text-center">
                        {((point.size || 1.0) * 100).toFixed(0)}%
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSizeChange(point.id, 0.1);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Aumentar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* Active toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(point.id);
                        }}
                        className={`p-1 rounded ${isActive ? "text-green-600 hover:bg-green-100" : "text-gray-400 hover:bg-gray-100"}`}
                        title={isActive ? "Desativar" : "Ativar"}
                      >
                        {isActive ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePoint(point.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Edit mode info panel */}
        {isPlanetEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"
          >
            <h4 className="font-semibold text-blue-900 mb-2">
              Modo de Edição Ativo
            </h4>
            <div className="text-blue-800 text-sm space-y-1">
              <p>
                • <strong>Criar:</strong> Clique em qualquer lugar da imagem
                para adicionar um novo ponto
              </p>
              <p>
                • <strong>Arrastar:</strong> Clique e arraste os ícones para
                reposicionar
              </p>
              <p>
                • <strong>Redimensionar:</strong> Use + / - nos controles que
                aparecem ao passar o mouse
              </p>
              <p>
                • <strong>Ativar/Desativar:</strong> Use o ícone de olho para
                mostrar/ocultar pontos
              </p>
              <p>
                • <strong>Excluir:</strong> Use o ícone de lixeira para remover
                pontos
              </p>
              <p>
                • <strong>Salvar:</strong> Clique no ícone de salvar no
                cabeçalho para confirmar alterações
              </p>
            </div>
          </motion.div>
        )}

        <div className="flex justify-center mt-4">
          <motion.button
            onClick={() => {
              if (isPlanetEditMode) {
                setPlanetEditMode(false);
              }
              setCurrentScreen("world");
            }}
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
