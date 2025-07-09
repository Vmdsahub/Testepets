import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Package, RefreshCw, ArrowLeft, Wrench } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

interface ShipActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipX: number;
  shipY: number;
  shipHP: number;
  onRepairShip: () => void;
}

interface ShipInventoryItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  quantity: number;
  effect: () => void;
}

const ACTIONS = [
  {
    id: "inspect",
    label: "Inspecionar",
    icon: Search,
    description: "Ver detalhes da nave",
  },
  {
    id: "inventory",
    label: "Inventário da Nave",
    icon: Package,
    description: "Gerenciar itens da nave",
  },
  {
    id: "change",
    label: "Trocar Nave",
    icon: RefreshCw,
    description: "Selecionar outra nave",
  },
];

type ModalView = "main" | "inspect" | "inventory";

export const ShipActionsModal: React.FC<ShipActionsModalProps> = ({
  isOpen,
  onClose,
  shipX,
  shipY,
  shipHP,
  onRepairShip,
}) => {
  const [currentView, setCurrentView] = useState<ModalView>("main");
  const [shipInventory, setShipInventory] = useState<ShipInventoryItem[]>([]);
  const { user } = useGameStore();
  // Load ship inventory from localStorage
  useEffect(() => {
    if (isOpen && user) {
      const savedInventory = localStorage.getItem(`ship-inventory-${user.id}`);
      if (savedInventory) {
        try {
          const inventory = JSON.parse(savedInventory);
          setShipInventory(
            inventory.map((item: any) => ({
              ...item,
              icon: Wrench, // Default icon for tools
              effect: () => {
                if (item.name === "Chave de fenda" && shipHP < 3) {
                  onRepairShip();
                  // Remove one item from inventory
                  const updatedInventory = shipInventory
                    .map((invItem) =>
                      invItem.id === item.id
                        ? { ...invItem, quantity: invItem.quantity - 1 }
                        : invItem,
                    )
                    .filter((invItem) => invItem.quantity > 0);
                  setShipInventory(updatedInventory);
                  localStorage.setItem(
                    `ship-inventory-${user.id}`,
                    JSON.stringify(updatedInventory),
                  );
                }
              },
            })),
          );
        } catch (e) {
          console.error("Error loading ship inventory:", e);
        }
      }
    }
  }, [isOpen, user, shipHP, onRepairShip, shipInventory]);

  // Handle ESC key and reset modal state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (currentView !== "main") {
          setCurrentView("main");
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      setCurrentView("main"); // Reset view when modal closes
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, currentView]);

  const handleActionClick = (actionId: string) => {
    switch (actionId) {
      case "inspect":
        setCurrentView("inspect");
        break;
      case "inventory":
        setCurrentView("inventory");
        break;
      case "change":
        // TODO: Implement ship change functionality
        console.log("Trocar nave - funcionalidade futura");
        onClose();
        break;
      default:
        onClose();
    }
  };

  const handleBackToMain = () => {
    setCurrentView("main");
  };

  const useInventoryItem = (item: ShipInventoryItem) => {
    item.effect();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={onClose}
          />

          {/* Modal positioned near ship */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${Math.min(Math.max(shipX, 140), window.innerWidth - 140)}px`,
              top: `${Math.max(shipY - 180, 20)}px`,
              transform: "translate(-50%, 0)",
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-64 pointer-events-auto backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">
                  Ações da Nave
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Actions list */}
              <div className="p-2">
                {ACTIONS.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleActionClick(action.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all duration-200 text-left group shadow-sm hover:shadow-md"
                    >
                      <div className="flex-shrink-0">
                        <IconComponent className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800 group-hover:text-blue-900 transition-colors duration-200">
                          {action.label}
                        </div>
                        <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors duration-200 truncate">
                          {action.description}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Arrow pointing to ship */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45 shadow-md"></div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
