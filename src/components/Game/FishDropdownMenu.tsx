import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Utensils, Trash2 } from "lucide-react";
import { Item } from "../../types/game";

interface FishDropdownMenuProps {
  fishItem: Item;
  onInspect: (fish: Item) => void;
  onFeed: (fish: Item) => void;
  onDiscard: (fish: Item) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const FishDropdownMenu: React.FC<FishDropdownMenuProps> = ({
  fishItem,
  onInspect,
  onFeed,
  onDiscard,
  disabled = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle right-click context menu
  const handleRightClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleAction = (action: () => void) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      action();
      setIsOpen(false);
    };
  };

  const getFishDisplayName = () => {
    if (fishItem.fishData) {
      return `${fishItem.fishData.species} (${fishItem.fishData.size})`;
    }
    return fishItem.name;
  };

  const getFishEmoji = () => {
    if (fishItem.fishData?.species === "Peixinho Azul") return "🐟";
    if (fishItem.fishData?.species === "Peixinho Verde") return "🐠";
    return "🐟";
  };

  return (
    <div className="relative" ref={menuRef}>
      <div onContextMenu={handleRightClick}>{children}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[180px]"
            >
              {/* Fish Info Header */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFishEmoji()}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getFishDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fishItem.rarity} • Tamanho{" "}
                      {fishItem.fishData?.size || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  onClick={handleAction(() => onInspect(fishItem))}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={disabled}
                >
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>Inspecionar</span>
                </button>

                <button
                  onClick={handleAction(() => onFeed(fishItem))}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={disabled}
                >
                  <Utensils className="w-4 h-4 text-green-500" />
                  <span>Alimentar</span>
                </button>

                <button
                  onClick={handleAction(() => onDiscard(fishItem))}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Descartar</span>
                </button>
              </div>

              {/* Fish Data Footer */}
              {fishItem.fishData && (
                <div className="px-3 py-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Pescado em{" "}
                    {fishItem.fishData.caughtAt.toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
