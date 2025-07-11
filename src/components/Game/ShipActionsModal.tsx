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
            })),
          );
        } catch (e) {
          console.error("Error loading ship inventory:", e);
        }
      }
    }
  }, [isOpen, user]);

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
    if (item.name === "Chave de fenda" && shipHP < 3 && user) {
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
  };

  // Function to add items to ship inventory (will be called from NPCModal)
  React.useEffect(() => {
    const handleAddToShipInventory = (event: CustomEvent) => {
      const { item } = event.detail;
      if (user) {
        const savedInventory = localStorage.getItem(
          `ship-inventory-${user.id}`,
        );
        let currentInventory = savedInventory ? JSON.parse(savedInventory) : [];

        const existingItemIndex = currentInventory.findIndex(
          (inv: any) => inv.name === item.name,
        );

        if (existingItemIndex >= 0) {
          currentInventory[existingItemIndex].quantity += 1;
        } else {
          currentInventory.push({
            id: item.id || Date.now().toString(),
            name: item.name,
            description: item.description,
            quantity: 1,
          });
        }

        localStorage.setItem(
          `ship-inventory-${user.id}`,
          JSON.stringify(currentInventory),
        );

        // Update current state if modal is open
        if (isOpen) {
          setShipInventory(
            currentInventory.map((item: any) => ({
              ...item,
              icon: Wrench,
            })),
          );
        }
      }
    };

    window.addEventListener(
      "addToShipInventory",
      handleAddToShipInventory as EventListener,
    );

    return () => {
      window.removeEventListener(
        "addToShipInventory",
        handleAddToShipInventory as EventListener,
      );
    };
  }, [user, isOpen]);

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
            <div
              className={`bg-white rounded-xl shadow-2xl border border-gray-200 pointer-events-auto backdrop-blur-sm transition-all duration-300 ${
                currentView === "main" ? "w-64" : "w-96"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {currentView !== "main" && (
                    <button
                      onClick={handleBackToMain}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {currentView === "main" && "Ações da Nave"}
                    {currentView === "inspect" && "Inspeção da Nave"}
                    {currentView === "inventory" && "Inventário da Nave"}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {currentView === "main" && (
                  <div className="space-y-2">
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
                )}

                {currentView === "inspect" && (
                  <div className="space-y-4">
                    {/* Ship Image */}
                    <div className="flex justify-center">
                      <img
                        src="https://cdn.builder.io/api/v1/image/assets%2Ff93cc7cc605f420aa4fbb47a6557dbb5%2Fba62973afdca4d84ba54dad060a3e993?format=webp&width=800"
                        alt="Nave do Jogador"
                        className="w-32 h-32 object-contain bg-gray-50 rounded-lg border border-gray-200"
                      />
                    </div>

                    {/* Ship Description */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          Explorador Galáctico MK-7
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Uma nave versátil projetada para exploração espacial
                          de longo alcance. Equipada com propulsores iônicos
                          avançados e sistema de navegação quântica, esta nave é
                          ideal para aventuras intergalácticas.
                        </p>
                      </div>

                      {/* Ship Stats */}
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">HP:</span>
                          <span className="text-sm font-medium text-gray-800">
                            {shipHP}/3
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Velocidade:
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            Média
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Blindagem:
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            Leve
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentView === "inventory" && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 mb-3">
                      Itens equipados na sua nave
                    </div>

                    {shipInventory.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          Inventário vazio
                        </p>
                        <p className="text-gray-400 text-xs">
                          Compre itens de NPCs para equipar sua nave
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {shipInventory.map((item) => {
                          const IconComponent = item.icon;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <IconComponent className="w-5 h-5 text-gray-600" />
                                <div>
                                  <div className="font-medium text-sm text-gray-800">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">
                                  x{item.quantity}
                                </span>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => useInventoryItem(item)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                  disabled={
                                    item.name === "Chave de fenda" &&
                                    shipHP >= 3
                                  }
                                >
                                  Usar
                                </motion.button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
