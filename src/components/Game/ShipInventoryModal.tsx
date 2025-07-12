import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Zap, Shield, Navigation } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { Ship } from "../../types/game";

interface ShipInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShipInventoryModal: React.FC<ShipInventoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { getAllShips, getOwnedShips, getActiveShip, switchActiveShip } =
    useGameStore();

  const allShips = getAllShips();
  const ownedShips = getOwnedShips();
  const activeShip = getActiveShip();

  // Include default ship in owned ships for display
  const defaultShip = allShips.find((ship) => ship.isDefault);
  const displayShips = defaultShip ? [defaultShip, ...ownedShips] : ownedShips;

  const handleSwitchShip = async (ship: Ship) => {
    const success = await switchActiveShip(ship.id);
    if (success) {
      onClose();
    }
  };

  const getStatColor = (value: number, baseline: number = 1.0) => {
    if (value > baseline) return "text-green-600";
    if (value < baseline) return "text-red-600";
    return "text-gray-600";
  };

  const getStatIcon = (statName: string) => {
    switch (statName) {
      case "speed":
        return <Zap className="w-3 h-3" />;
      case "projectileDamage":
        return <Star className="w-3 h-3" />;
      case "health":
        return <Shield className="w-3 h-3" />;
      case "maneuverability":
        return <Navigation className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatLabel = (statName: string) => {
    switch (statName) {
      case "speed":
        return "Velocidade";
      case "projectileDamage":
        return "Dano";
      case "health":
        return "HP";
      case "maneuverability":
        return "Manobrabilidade";
      default:
        return statName;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Hangar de Naves
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Gerencie suas naves espaciais
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {displayShips.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Nenhuma Nave Encontrada
                  </h3>
                  <p className="text-gray-600">
                    Visite a Planície Dourada para comprar naves!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {displayShips.map((ship) => {
                    const isActive = activeShip?.id === ship.id;
                    const isDefault = ship.isDefault;

                    return (
                      <motion.div
                        key={ship.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`relative bg-gradient-to-br rounded-xl p-4 border-2 transition-all duration-300 ${
                          isActive
                            ? "from-blue-50 to-blue-100 border-blue-300 shadow-lg"
                            : "from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {/* Active Badge */}
                        {isActive && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Ativa
                          </div>
                        )}

                        {/* Default Badge */}
                        {isDefault && (
                          <div className="absolute top-2 left-2 bg-gray-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Padrão
                          </div>
                        )}

                        {/* Ship Image */}
                        <div className="flex justify-center mb-4">
                          <img
                            src={ship.imageUrl}
                            alt={ship.name}
                            className="w-24 h-24 object-contain bg-white rounded-lg border border-gray-200"
                          />
                        </div>

                        {/* Ship Info */}
                        <div className="text-center mb-4">
                          <h3 className="font-bold text-lg text-gray-800 mb-1">
                            {ship.name}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {ship.description}
                          </p>
                        </div>

                        {/* Ship Stats */}
                        <div className="bg-white rounded-lg p-3 mb-4 border border-gray-100">
                          <h4 className="font-semibold text-gray-800 mb-2 text-sm">
                            Estatísticas
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(ship.stats).map(([stat, value]) => (
                              <div
                                key={stat}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1">
                                  {getStatIcon(stat)}
                                  <span className="text-gray-600">
                                    {getStatLabel(stat)}:
                                  </span>
                                </div>
                                <span
                                  className={`font-semibold ${getStatColor(
                                    value,
                                  )}`}
                                >
                                  {stat === "speed" ||
                                  stat === "projectileDamage"
                                    ? `${(value * 100).toFixed(0)}%`
                                    : value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Visual Effects */}
                        <div className="bg-white rounded-lg p-3 mb-4 border border-gray-100">
                          <h4 className="font-semibold text-gray-800 mb-2 text-sm">
                            Efeitos Visuais
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              Rastro:
                            </span>
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{
                                backgroundColor: ship.visualEffects.trailColor,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-600">
                              Projétil:
                            </span>
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{
                                backgroundColor:
                                  ship.visualEffects.projectileColor,
                              }}
                            />
                          </div>
                        </div>

                        {/* Action Button */}
                        {!isActive && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSwitchShip(ship)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            Equipar Nave
                          </motion.button>
                        )}

                        {isActive && (
                          <div className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded-lg font-medium text-center">
                            Nave Equipada
                          </div>
                        )}

                        {/* Purchase Date */}
                        {ship.ownedAt && (
                          <div className="text-xs text-gray-500 text-center mt-2">
                            Adquirida em{" "}
                            {new Date(ship.ownedAt).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
