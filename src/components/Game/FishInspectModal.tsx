import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Calendar, Ruler, Star, Trash2 } from "lucide-react";
import { Item } from "../../types/game";
import { FISH_SPECIES } from "../../types/fish";

interface FishInspectModalProps {
  fishItem: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onFeed: (fish: Item) => void;
  onDiscard: (fish: Item) => void;
}

export const FishInspectModal: React.FC<FishInspectModalProps> = ({
  fishItem,
  isOpen,
  onClose,
  onFeed,
  onDiscard,
}) => {
  if (!fishItem || !fishItem.fishData) return null;

  const { fishData } = fishItem;
  const speciesInfo = FISH_SPECIES[fishData.species];

  const getRarityColor = (rarity: string) => {
    const colors = {
      Common: "text-gray-600 bg-gray-100",
      Uncommon: "text-green-600 bg-green-100",
      Rare: "text-blue-600 bg-blue-100",
      Epic: "text-purple-600 bg-purple-100",
      Legendary: "text-yellow-600 bg-yellow-100",
    };
    return colors[rarity as keyof typeof colors] || colors.Common;
  };

  const getSizeDescription = (size: number) => {
    const maxSize = speciesInfo.sizeRange.max;
    const percentage = (size / maxSize) * 100;

    if (percentage >= 90) return "Espécime Gigante";
    if (percentage >= 70) return "Muito Grande";
    if (percentage >= 50) return "Grande";
    if (percentage >= 30) return "Médio";
    return "Pequeno";
  };

  const getFishEmoji = () => {
    if (fishData.species === "Peixinho Azul") return "🐟";
    if (fishData.species === "Peixinho Verde") return "🐠";
    return "🐟";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Inspeção do Peixe
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Fish Display */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center mb-4 shadow-lg">
                  {fishItem.imageUrl ? (
                    <img
                      src={fishItem.imageUrl}
                      alt={fishItem.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <span className="text-4xl">{getFishEmoji()}</span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {fishData.species}
                </h3>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getRarityColor(fishItem.rarity)}`}
                  >
                    {fishItem.rarity}
                  </span>
                </div>

                <p className="text-gray-600 text-sm">
                  {speciesInfo.description}
                </p>
              </div>

              {/* Fish Stats */}
              <div className="space-y-4 mb-6">
                {/* Size */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Ruler className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Tamanho</p>
                      <p className="text-sm text-gray-600">
                        {fishData.size} • {getSizeDescription(fishData.size)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {fishData.size}
                      </p>
                      <p className="text-xs text-gray-500">
                        de {speciesInfo.sizeRange.max}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rarity Stars */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Raridade</p>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const rarityLevel =
                            fishItem.rarity === "Common"
                              ? 1
                              : fishItem.rarity === "Uncommon"
                                ? 2
                                : fishItem.rarity === "Rare"
                                  ? 3
                                  : fishItem.rarity === "Epic"
                                    ? 4
                                    : 5;
                          return (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < rarityLevel
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Local da Pesca
                      </p>
                      <p className="text-sm text-gray-600">
                        Coordenadas: ({fishData.caughtPosition.x.toFixed(2)},{" "}
                        {fishData.caughtPosition.y.toFixed(2)})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date Caught */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Data da Pesca</p>
                      <p className="text-sm text-gray-600">
                        {fishData.caughtAt.toLocaleDateString("pt-BR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Species Information */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Informações da Espécie
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tamanho Mínimo:</span>
                    <span className="font-medium">
                      {speciesInfo.sizeRange.min}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tamanho Máximo:</span>
                    <span className="font-medium">
                      {speciesInfo.sizeRange.max}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tempo de Respawn:</span>
                    <span className="font-medium">
                      {speciesInfo.respawnTime / 1000}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={() => {
                    onFeed(fishItem);
                    onClose();
                  }}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Alimentar
                </motion.button>

                <motion.button
                  onClick={() => {
                    onDiscard(fishItem);
                    onClose();
                  }}
                  className="px-4 py-3 bg-red-100 hover:bg-red-200 rounded-2xl transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </motion.button>
              </div>

              <motion.button
                onClick={onClose}
                className="w-full mt-3 text-gray-600 hover:text-gray-800 transition-colors py-2"
                whileHover={{ scale: 1.02 }}
              >
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
