import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

interface NPCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "xenocoins" | "cash";
  imageUrl?: string;
}

const DIALOGUE_TEXT =
  "Boa tarde, ou será noite? Meu nome é Bahrun, eu viajo entre os planetas próximos procurando suprimentos para ajudar os novatos, por um custo é claro...";

// Alien characters for translation effect
const ALIEN_CHARS = "◊◈◇◆☾☽⟡⟢⧿⧾⬟⬠⬢⬣⬡⬠⧨⧩⟐⟑ξζηθικλμνοπρστυφχψω";

const generateAlienChar = () => {
  return ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)];
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "repair_kit",
    name: "Kit de Reparos Básico",
    description: "Restaura 1 HP da nave",
    price: 20,
    currency: "xenocoins",
    imageUrl:
      "https://cdn.builder.io/api/v1/image/assets%2F374f0317fa034d00bf28d60f517709e5%2Fee180bf68c2747bc9236599bba53c46f?format=webp&width=800",
  },
];

export const NPCModal: React.FC<NPCModalProps> = ({ isOpen, onClose }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setIsTypingComplete] = useState(false);
  const [currentAlienChar, setCurrentAlienChar] = useState("");
  const [isShowingAlien, setIsShowingAlien] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user, xenocoins, updateCurrency, addNotification } = useGameStore();

  // Typewriter effect with alien translation
  useEffect(() => {
    if (!isOpen) {
      setDisplayedText("");
      setCurrentIndex(0);
      setIsTypingComplete(false);
      setCurrentAlienChar("");
      setIsShowingAlien(false);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      return;
    }

    if (currentIndex < DIALOGUE_TEXT.length) {
      // First show alien character
      setIsShowingAlien(true);
      setCurrentAlienChar(generateAlienChar());

      // After showing alien char, replace with real character
      intervalRef.current = setTimeout(() => {
        setIsShowingAlien(false);
        setDisplayedText((prev) => prev + DIALOGUE_TEXT[currentIndex]);
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
  }, [isOpen, currentIndex]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Purchase item function
  const purchaseItem = async (item: ShopItem) => {
    if (!user) return;

    if (xenocoins < item.price) {
      addNotification({
        type: "error",
        message: "Xenocoins insuficientes!",
      });
      return;
    }

    try {
      // Deduct currency
      const success = await updateCurrency(item.currency, -item.price);

      if (success) {
        // Add item to ship inventory
        const shipItem = {
          id: item.id,
          name: item.name,
          description: item.description,
        };

        // Dispatch custom event to add to ship inventory
        const event = new CustomEvent("addToShipInventory", {
          detail: { item: shipItem },
        });
        window.dispatchEvent(event);

        addNotification({
          type: "success",
          message: `${item.name} adicionado ao inventário da nave!`,
        });
      } else {
        addNotification({
          type: "error",
          message: "Erro ao processar compra.",
        });
      }
    } catch (error) {
      console.error("Purchase error:", error);
      addNotification({
        type: "error",
        message: "Erro ao processar compra.",
      });
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
            className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
              aria-label="Fechar modal"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* NPC Image */}
            <div className="flex justify-center p-4 sm:p-6 pb-4">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F542e75b77d74474ca612f291b2642c2c%2F9db05452f51a4f1e813928729ddf09b2?format=webp&width=800"
                alt="Bahrun"
                className="w-full h-48 sm:h-64 object-cover rounded-3xl"
                style={{ imageRendering: "crisp-edges" }}
              />
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-6">
              {/* Character name */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Bahrun
                </h2>
                <div className="w-32 h-0.5 bg-gray-200 mx-auto rounded-full"></div>
              </div>

              {/* Dialogue box */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[140px] relative">
                <div className="text-gray-700 leading-relaxed text-base">
                  {displayedText}
                  {isShowingAlien && (
                    <span className="text-gray-900 font-bold">
                      {currentAlienChar}
                    </span>
                  )}
                </div>
              </div>

              {/* Shop Items */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                  Itens à venda
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {SHOP_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="relative bg-gray-50 rounded-lg border border-gray-100 p-3 aspect-square flex flex-col items-center justify-between"
                    >
                      {/* Item Image */}
                      <div className="flex-1 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-contain"
                          />
                        ) : (
                          <Wrench className="w-8 h-8 text-gray-600" />
                        )}
                      </div>

                      {/* Item Name */}
                      <div className="text-center">
                        <div className="font-medium text-xs text-gray-800 mb-1">
                          {item.name}
                        </div>
                      </div>

                      {/* Price and Buy Button */}
                      <div className="w-full space-y-2">
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-800 flex items-center justify-center gap-1">
                            <img
                              src="https://cdn.builder.io/api/v1/image/assets%2Ff481900009a94cda953c032479392a30%2F3e6c6cb85c6a4d2ba05acb245bfbc214?format=webp&width=800"
                              alt="Xenocoins"
                              className="w-3 h-3"
                            />
                            {item.price}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => purchaseItem(item)}
                          disabled={xenocoins < item.price}
                          className={`w-full px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                            xenocoins >= item.price
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Comprar
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Despedir-se
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
