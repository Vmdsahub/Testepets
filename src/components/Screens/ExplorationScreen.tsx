import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Info, MapPin } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { MemoryCrystalsGame } from "../Game/MemoryCrystalsGame";
import { EggSelectionScreen } from "../Pet/EggSelectionScreen";

export const ExplorationScreen: React.FC = () => {
  const {
    currentExplorationPoint,
    currentExplorationArea,
    currentMinigame,
    setCurrentScreen,
    setCurrentExplorationPoint,
    setCurrentExplorationArea,
    setCurrentMinigame,
    getExplorationArea,
    getAllShips,
    getOwnedShips,
    purchaseShip,
    xenocoins,
    selectedEggForHatching,
    isHatchingInProgress,
    setSelectedEggForHatching,
    setIsHatchingInProgress,
  } = useGameStore();

  // State for dialogue system (similar to NPCModal)
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [currentAlienChar, setCurrentAlienChar] = useState("");
  const [isShowingAlien, setIsShowingAlien] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // State for egg selection
  const [showEggSelection, setShowEggSelection] = useState(false);

  // Auto-redirect to fishing game when entering Templo dos Anciões
  useEffect(() => {
    if (currentExplorationPoint?.name === "Templo dos Anciões") {
      setCurrentScreen("fishing");
    }
  }, [currentExplorationPoint, setCurrentScreen]);

  // Dialogue text for Planície Dourada
  const GOLDEN_PLAINS_DIALOGUE =
    "Olá, temos algumas naves em nossa coleção especial. Cada uma foi cuidadosamente selecionada para exploradores como você...";

  // Dialogue text for Túneis Profundos
  const DEEP_TUNNELS_DIALOGUE =
    "Bem-vindo aos Túneis Profundos, explorador. Estas passagens antigas guardam segredos de civilizações perdidas. Aqui você pode acessar nossos minijogos especiais e testar suas habilidades...";

  // Dialogue text for Santuário dos Ovos
  const EGG_SANCTUARY_DIALOGUE =
    "Saudações, jovem guardião. Este é o Santuário dos Ovos Ancestrais, onde os ovos sagrados aguardam por seus companheiros destinados. Escolha sabiamente, pois esta decisão moldará sua jornada...";

  // Alien characters for translation effect
  const ALIEN_CHARS = "◊◈◇◆☾☽⟡⟢⧿⧾⬟⬠⬢⬣⬡⬠⧨⧿⟐���ξζηθικλμνοπρστυφχψω";

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

  // Reset dialogue when point changes
  useEffect(() => {
    const pointName = currentExplorationPoint?.name;
    const planetId = currentExplorationPoint?.planetId;
    if (
      pointName === "Planície Dourada" ||
      pointName === "Túneis Profundos" ||
      planetId === "planet-5"
    ) {
      setDisplayedText("");
      setCurrentIndex(0);
      setIsTypingComplete(false);
      setCurrentAlienChar("");
      setIsShowingAlien(false);
    }
  }, [currentExplorationPoint?.name, currentExplorationPoint?.planetId]);

  // Typewriter effect for dialogue
  useEffect(() => {
    const pointName = currentExplorationPoint?.name;
    const planetId = currentExplorationPoint?.planetId;
    if (
      pointName !== "Planície Dourada" &&
      pointName !== "Túneis Profundos" &&
      planetId !== "planet-5"
    ) {
      return;
    }

    const dialogue =
      pointName === "Planície Dourada"
        ? GOLDEN_PLAINS_DIALOGUE
        : pointName === "Túneis Profundos"
          ? DEEP_TUNNELS_DIALOGUE
          : pointName === "Santuário dos Ovos"
            ? EGG_SANCTUARY_DIALOGUE
            : "Bem-vindos a este local sagrado da Vila Ancestral. Aqui a sabedoria antiga ecoa através dos tempos...";

    if (currentIndex < dialogue.length) {
      // First show alien character
      setIsShowingAlien(true);
      setCurrentAlienChar(generateAlienChar());

      // After showing alien char, replace with real character
      intervalRef.current = setTimeout(() => {
        setIsShowingAlien(false);
        setDisplayedText((prev) => prev + dialogue[currentIndex]);
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
  }, [currentIndex, currentExplorationPoint?.name]);

  if (!currentExplorationPoint || !currentExplorationArea) {
    return null;
  }

  // Handle minigame navigation
  const handleBackFromMinigame = () => {
    setCurrentMinigame(null);
  };

  // Handle egg selection
  const handleEggSelected = (egg: any) => {
    setSelectedEggForHatching(egg);
    setIsHatchingInProgress(true);
    setShowEggSelection(false);
    // Navigate back to pet screen to show hatching
    setCurrentExplorationPoint(null);
    setCurrentExplorationArea(null);
    setCurrentScreen("world");
    setTimeout(() => {
      setCurrentScreen("pet");
    }, 100);
  };

  const handleBackFromEggSelection = () => {
    setShowEggSelection(false);
  };

  // Render minigame if one is active
  if (currentMinigame === "memory-crystals") {
    return <MemoryCrystalsGame onBack={handleBackFromMinigame} />;
  }

  // Render egg selection if active
  if (showEggSelection) {
    return (
      <div className="pb-24">
        <EggSelectionScreen
          onEggSelected={handleEggSelected}
          onBack={handleBackFromEggSelection}
        />
      </div>
    );
  }

  const handleBack = () => {
    setCurrentExplorationPoint(null);
    setCurrentExplorationArea(null);
    setCurrentScreen("planet");
  };

  const handleBackToWorld = () => {
    setCurrentExplorationPoint(null);
    setCurrentExplorationArea(null);
    setCurrentScreen("world");
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
              currentExplorationPoint.name === "Planície Dourada" ||
              currentExplorationPoint.name === "T��neis Profundos"
                ? "h-80 sm:h-96"
                : "h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-340px)]"
            }`}
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              src={currentExplorationArea.imageUrl}
              alt={currentExplorationArea.name}
              className={`w-full h-full ${
                currentExplorationPoint.name === "Planície Dourada" ||
                currentExplorationPoint.name === "Túneis Profundos"
                  ? "object-contain bg-gradient-to-b from-blue-50 to-blue-100"
                  : "object-cover"
              }`}
            />

            {/* Overlay info - only show for locations without special content */}
            {currentExplorationPoint.name !== "Plan��cie Dourada" &&
              currentExplorationPoint.name !== "Túneis Profundos" &&
              currentExplorationPoint.planetId !== "planet-5" && (
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

          {/* Special Content for Planície Dourada, Túneis Profundos, and Vila Ancestral */}
          {currentExplorationPoint.name === "Planície Dourada" ||
          currentExplorationPoint.name === "Túneis Profundos" ||
          currentExplorationPoint.name === "Santuário dos Ovos" ||
          currentExplorationPoint.planetId === "planet-5" ? (
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
                    {currentExplorationPoint.name === "Planície Dourada"
                      ? "Guardian da Planície"
                      : currentExplorationPoint.name === "Túneis Profundos"
                        ? "Bahrun"
                        : currentExplorationPoint.name === "Santuário dos Ovos"
                          ? "Ancião Guardião"
                          : currentExplorationPoint.planetId === "planet-5"
                            ? "Sábio Ancestral"
                            : "Guardião"}
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

              {/* Content Section */}
              {currentExplorationPoint.name === "Santuário dos Ovos" ? (
                /* Egg Selection Section for Santuário dos Ovos */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="bg-purple-50 border border-purple-200 rounded-xl p-4"
                >
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-purple-900 mb-2">
                      Santuário dos Ovos Ancestrais
                    </h4>
                    <div className="text-purple-700 text-xs">
                      Escolha seu primeiro companheiro para começar sua jornada
                    </div>
                  </div>

                  <motion.button
                    onClick={() => setShowEggSelection(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">🥚</span>
                    <div className="text-left">
                      <div className="font-semibold">
                        Escolher Ovo Ancestral
                      </div>
                      <div className="text-sm opacity-90">
                        Comece sua jornada
                      </div>
                    </div>
                  </motion.button>
                </motion.div>
              ) : currentExplorationPoint.name === "Planície Dourada" ? (
                /* Ship Store Section for Planície Dourada */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                >
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Loja de Naves
                    </h4>
                    <div className="text-blue-700 text-xs">
                      Naves especiais para exploradores experientes
                    </div>
                  </div>

                  <div className="bg-white border border-blue-100 rounded-lg p-4">
                    {(() => {
                      const availableShips = getAllShips().filter(
                        (ship) => !ship.isDefault,
                      );
                      const ownedShips = getOwnedShips();

                      return (
                        <div className="grid gap-3">
                          {availableShips.map((ship) => {
                            const isOwned = ownedShips.find(
                              (owned) => owned.id === ship.id,
                            );
                            const canAfford = xenocoins >= ship.price;

                            return (
                              <div
                                key={ship.id}
                                className="bg-gray-50 rounded-lg border border-gray-200 p-3"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Ship Image */}
                                  <div className="flex-shrink-0">
                                    <img
                                      src={ship.imageUrl}
                                      alt={ship.name}
                                      className="w-16 h-16 object-contain bg-white rounded-lg border border-gray-100"
                                    />
                                  </div>

                                  {/* Ship Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-800 text-sm mb-1">
                                      {ship.name}
                                    </div>
                                    <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                                      {ship.description}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                        +
                                        {((ship.stats.speed - 1) * 100).toFixed(
                                          0,
                                        )}
                                        % Velocidade
                                      </span>
                                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                                        +
                                        {(
                                          (ship.stats.projectileDamage - 1) *
                                          100
                                        ).toFixed(0)}
                                        % Dano
                                      </span>
                                    </div>
                                  </div>

                                  {/* Price and Buy Button */}
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-2">
                                      <img
                                        src="https://cdn.builder.io/api/v1/image/assets%2Ff481900009a94cda953c032479392a30%2F3e6c6cb85c6a4d2ba05acb245bfbc214?format=webp&width=800"
                                        alt="Xenocoins"
                                        className="w-4 h-4"
                                      />
                                      <span className="font-semibold text-sm text-gray-800">
                                        {ship.price}
                                      </span>
                                    </div>

                                    {isOwned ? (
                                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-medium">
                                        Possuída
                                      </div>
                                    ) : (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => purchaseShip(ship.id)}
                                        disabled={!canAfford}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                          canAfford
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        }`}
                                      >
                                        {canAfford ? "Comprar" : "Sem Moeda"}
                                      </motion.button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              ) : currentExplorationPoint.name === "Túneis Profundos" ? (
                /* Minigame Cards Section for Túneis Profundos */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                >
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Centro de Minijogos
                    </h4>
                    <div className="text-gray-700 text-xs">
                      Teste suas habilidades em desafios únicos
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "memory-crystals",
                        name: "Cristais da Memória",
                        description:
                          "Teste sua memória com padrões cristalinos",
                        color: "bg-blue-500",
                        icon: "🔹",
                      },
                      {
                        id: "tunnel-runner",
                        name: "Corredor dos Túneis",
                        description: "Navigate pelos túneis em alta velocidade",
                        color: "bg-green-500",
                        icon: "🏃",
                      },
                      {
                        id: "energy-puzzle",
                        name: "Quebra-Cabeça Energético",
                        description: "Resolva circuitos de energia antiga",
                        color: "bg-yellow-500",
                        icon: "⚡",
                      },
                      {
                        id: "ancient-symbols",
                        name: "S��mbolos Ancestrais",
                        description:
                          "Decifre os mistérios das civilizações perdidas",
                        color: "bg-purple-500",
                        icon: "🔮",
                      },
                      {
                        id: "echo-chambers",
                        name: "Câmaras do Eco",
                        description: "Reproduza sequências sonoras complexas",
                        color: "bg-pink-500",
                        icon: "��",
                      },
                      {
                        id: "crystal-mining",
                        name: "Mineração de Cristais",
                        description: "Extraia cristais preciosos com precisão",
                        color: "bg-indigo-500",
                        icon: "⛏️",
                      },
                    ].map((game) => (
                      <motion.div
                        key={game.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
                        onClick={() => {
                          if (game.id === "memory-crystals") {
                            setCurrentMinigame("memory-crystals");
                          } else {
                            // TODO: Implementar outros minijogos
                            alert(
                              `Minijogo "${game.name}" em desenvolvimento!`,
                            );
                          }
                        }}
                      >
                        <div
                          className={`w-full h-20 ${game.color} rounded-lg mb-3 flex items-center justify-center text-2xl text-white`}
                        >
                          {game.icon}
                        </div>
                        <div className="text-center">
                          <h5 className="font-semibold text-gray-800 text-xs mb-1">
                            {game.name}
                          </h5>
                          <p className="text-xs text-gray-600 leading-tight">
                            {game.description}
                          </p>
                          <div className="mt-2 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                            Em Desenvolvimento
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : currentExplorationPoint.planetId === "planet-5" ? (
                /* Other Vila Ancestral locations */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"
                >
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">
                      {currentExplorationPoint.name}
                    </h4>
                    <div className="text-indigo-700 text-xs">
                      Explore os mistérios ancestrais
                    </div>
                  </div>

                  {currentExplorationPoint.name === "Templo dos Anciões" ? (
                    <div className="bg-white border border-indigo-100 rounded-lg p-4 text-center">
                      <div className="text-4xl mb-2">🏛️</div>
                      <p className="text-indigo-800 text-sm mb-4">
                        As águas sagradas do templo escondem criaturas místicas
                        que os anciões protegiam. Teste suas habilidades de
                        pesca neste local sagrado.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentScreen("fishing")}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        🎣 Entrar no Templo
                      </motion.button>
                    </div>
                  ) : (
                    <div className="bg-white border border-indigo-100 rounded-lg p-4 text-center">
                      <div className="text-4xl mb-2">🏛️</div>
                      <p className="text-indigo-800 text-sm">
                        Este local sagrado guarda segredos antigos. Em breve
                        você poderá explorar suas maravilhas.
                      </p>
                      <div className="mt-3 bg-indigo-100 text-indigo-700 px-3 py-2 rounded text-xs font-medium">
                        Em Desenvolvimento
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : null}
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

          {/* Back buttons */}
          <div className="flex justify-center mt-6 gap-3">
            <motion.button
              onClick={handleBack}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors font-medium text-gray-700 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Planeta
            </motion.button>

            <motion.button
              onClick={handleBackToWorld}
              className="px-6 py-3 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors font-medium text-blue-700 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Mapa Galáctico
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
