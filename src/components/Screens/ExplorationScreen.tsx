import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Info, MapPin } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

export const ExplorationScreen: React.FC = () => {
  const {
    currentExplorationPoint,
    currentExplorationArea,
    setCurrentScreen,
    setCurrentExplorationPoint,
    setCurrentExplorationArea,
    getExplorationArea,
  } = useGameStore();

  // Generate exploration area when exploration point is selected
  useEffect(() => {
    if (currentExplorationPoint && !currentExplorationArea) {
      const area = getExplorationArea(currentExplorationPoint.id);
      setCurrentExplorationArea(area);
    }
  }, [
    currentExplorationPoint,
    currentExplorationArea,
    getExplorationArea,
    setCurrentExplorationArea,
  ]);

  if (!currentExplorationPoint || !currentExplorationArea) {
    return null;
  }

  const handleBack = () => {
    setCurrentExplorationPoint(null);
    setCurrentExplorationArea(null);
    setCurrentScreen("planet");
  };

  return (
    <div className="h-full w-full pt-20 pb-20 px-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              onClick={handleBack}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">
                {currentExplorationArea.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{currentExplorationPoint.name}</span>
              </div>
            </div>
          </div>

          {/* Main Image */}
          <div className="w-full h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-340px)] relative rounded-2xl overflow-hidden mb-4">
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              src={currentExplorationArea.imageUrl}
              alt={currentExplorationArea.name}
              className="w-full h-full object-cover"
            />

            {/* Overlay info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="text-white">
                <h3 className="text-lg font-semibold mb-1">
                  {currentExplorationPoint.name}
                </h3>
                {currentExplorationArea.description && (
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {currentExplorationArea.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info Panel */}
          {currentExplorationPoint.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Informações do Local
                  </h4>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {currentExplorationPoint.description}
                  </p>

                  {/* Show coordinates for custom points (for debugging/admin) */}
                  {currentExplorationPoint.id.includes("custom") && (
                    <div className="mt-2 text-xs text-blue-600 opacity-75">
                      Coordenadas: {currentExplorationPoint.x.toFixed(1)}%,{" "}
                      {currentExplorationPoint.y.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
