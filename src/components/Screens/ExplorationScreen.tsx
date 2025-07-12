import React, { useEffect, useState, useRef } from "react";
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

  // State for dialogue system (similar to NPCModal)
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [currentAlienChar, setCurrentAlienChar] = useState("");
  const [isShowingAlien, setIsShowingAlien] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dialogue text for Planície Dourada
  const GOLDEN_PLAINS_DIALOGUE =
    "Olá, visitante! Bem-vindo à Planície Dourada. Sou o Guardian desta região. Aqui encontrará paz e tranquilidade, longe do caos galáctico...";

  // Alien characters for translation effect
  const ALIEN_CHARS = "◊◈◇◆☾☽⟡⟢⧿⧾⬟⬠⬢⬣⬡⬠⧨⧩⟐⟑ξζηθικλμνοπρστυφχψω";

  const generateAlienChar = () => {
    return ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)];
  };

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

  // Typewriter effect for Planície Dourada dialogue
  useEffect(() => {
    if (currentExplorationPoint?.name !== "Planície Dourada") {
      return;
    }

    setDisplayedText("");
    setCurrentIndex(0);
    setIsTypingComplete(false);
    setCurrentAlienChar("");
    setIsShowingAlien(false);

    if (currentIndex < GOLDEN_PLAINS_DIALOGUE.length) {
      // First show alien character
      setIsShowingAlien(true);
      setCurrentAlienChar(generateAlienChar());

      // After showing alien char, replace with real character
      intervalRef.current = setTimeout(() => {
        setIsShowingAlien(false);
        setDisplayedText((prev) => prev + GOLDEN_PLAINS_DIALOGUE[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 40); // Show alien char for 40ms, then continue quickly
    } else {
      setIsTypingComplete(true);
      setIsShowingAlien(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [currentExplorationPoint, currentIndex]);

  if (!currentExplorationPoint || !currentExplorationArea) {
    return null;
  }

  const handleBack = () => {
    setCurrentExplorationPoint(null);
    setCurrentExplorationArea(null);
    setCurrentScreen("planet");
  };

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
          <div
            className={`w-full relative rounded-2xl overflow-hidden mb-4 ${
              currentExplorationPoint.name === "Planície Dourada"
                ? "h-64 sm:h-72"
                : "h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-340px)]"
            }`}
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              src={currentExplorationArea.imageUrl}
              alt={currentExplorationArea.name}
              className="w-full h-full object-cover"
            />

            {/* Overlay info - only show for non-Planície Dourada locations */}
            {currentExplorationPoint.name !== "Planície Dourada" && (
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
            )}
          </div>

          {/* Planície Dourada Special Content */}
          {currentExplorationPoint.name === "Planície Dourada" ? (
            <>
              {/* Dialogue Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4"
              >
                <div className="text-center mb-3">
                  <h3 className="text-lg font-bold text-gray-800">
                    Guardian da Planície
                  </h3>
                  <div className="w-24 h-0.5 bg-gray-200 mx-auto rounded-full mt-1"></div>
                </div>
                <div className="bg-white border border-gray-100 rounded-lg p-4 min-h-[120px] relative">
                  <div className="text-gray-700 leading-relaxed text-sm">
                    {displayedText}
                    {isShowingAlien && (
                      <span className="text-gray-900 font-bold">
                        {currentAlienChar}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Ship Store Section - Empty for future development */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4"
              >
                <div className="text-center">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Loja de Naves
                  </h4>
                  <div className="bg-white border border-blue-100 rounded-lg p-8 text-center">
                    <div className="text-blue-600 text-sm opacity-75">
                      🚀 Em Breve: Venda de Naves Espaciais
                    </div>
                    <div className="text-blue-500 text-xs mt-2">
                      Esta área será desenvolvida para venda de naves no futuro
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            /* Additional Info Panel for other locations */
            currentExplorationPoint.description && (
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
            )
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
