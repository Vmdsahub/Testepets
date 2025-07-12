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

  // Check if this is the Golden Plains (Planície Dourada) location
  const isGoldenPlains = currentExplorationPoint.name === "Planície Dourada";

  return (
    <motion.div
      className="h-full w-full pt-20 pb-20 px-4 overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="bg-white rounded-3xl shadow-xl p-4"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          {isGoldenPlains ? (
            // Golden Plains NPC Interface
            <>
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">
                  Comerciante de Naves
                </h1>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{currentExplorationPoint.name}</span>
                </div>
              </div>

              {/* NPC Image */}
              <div className="w-full max-w-sm mx-auto mb-6">
                <motion.img
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  src="https://cdn.builder.io/api/v1/image/assets%2Fc409e57c2e4e4703ba40cacd40b6e77f%2Fdcd15d3cffb44b4dbe2b4590e10922f0?format=webp&width=800"
                  alt="Comerciante de Naves"
                  className="w-full h-auto rounded-2xl"
                />
              </div>

              {/* NPC Dialogue */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
              >
                <div className="text-amber-900">
                  <p className="text-sm leading-relaxed mb-2">
                    "Olá, viajante! Bem-vindo à minha loja de naves espaciais.
                    Aqui você encontrará as melhores embarcações da galáxia!"
                  </p>
                  <p className="text-sm leading-relaxed">
                    "Cada nave foi cuidadosamente selecionada para oferecer o
                    melhor desempenho em suas jornadas pelo cosmos. Que tal dar
                    uma olhada no que tenho disponível?"
                  </p>
                </div>
              </motion.div>

              {/* Ship Sales Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-4"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                  🚀 Loja de Naves Espaciais
                </h3>
                <div className="text-center text-gray-600">
                  <p className="text-sm mb-4">
                    Sistema de vendas em desenvolvimento...
                  </p>
                  <div className="h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">
                      Catálogo de naves será exibido aqui
                    </span>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            // Default exploration view
            <>
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">
                  {currentExplorationArea.name}
                </h1>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{currentExplorationPoint.name}</span>
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
            </>
          )}

          {/* Back button */}
          <div className="flex justify-center mt-6">
            <motion.button
              onClick={handleBack}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors font-medium text-gray-700 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Planeta
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
