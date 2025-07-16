import React, { useState } from "react";
import {
  Package,
  Sword,
  Sparkles,
  Trash2,
  Plus,
  Search,
  Heart,
  Utensils,
  Shield,
  X,
} from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { Item } from "../../types/game";
import { motion, AnimatePresence } from "framer-motion";
import { FishDropdownMenu } from "../Game/FishDropdownMenu";
import { FishInspectModal } from "../Game/FishInspectModal";
import { fishingService } from "../../services/fishingService";

const tabs = [
  { id: "all", name: "All", icon: Package, color: "text-gray-600" },
  {
    id: "consumables",
    name: "Consumables",
    icon: Heart,
    color: "text-green-600",
  },
  { id: "equipment", name: "Equipment", icon: Sword, color: "text-blue-600" },
  { id: "fish", name: "Fish", icon: Utensils, color: "text-cyan-600" },
  { id: "special", name: "Special", icon: Sparkles, color: "text-purple-600" },
];

interface InventoryScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [fishInspectModal, setFishInspectModal] = useState<{
    isOpen: boolean;
    fish: Item | null;
  }>({ isOpen: false, fish: null });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const {
    activePet,
    inventory,
    addNotification,
    useItem,
    removeFromInventory,
  } = useGameStore();

  const getRarityColor = (rarity: string) => {
    const colors = {
      Common: "border-gray-300 bg-gray-50 text-gray-700",
      Uncommon: "border-green-300 bg-green-50 text-green-700",
      Rare: "border-blue-300 bg-blue-50 text-blue-700",
      Epic: "border-purple-300 bg-purple-50 text-purple-700",
      Legendary: "border-yellow-300 bg-yellow-50 text-yellow-700",
      Unique: "border-red-300 bg-red-50 text-red-700",
    };
    return colors[rarity as keyof typeof colors] || colors.Common;
  };

  const getRarityGlow = (rarity: string) => {
    const glows = {
      Common: "",
      Uncommon: "shadow-green-200/50",
      Rare: "shadow-blue-200/50",
      Epic: "shadow-purple-200/50",
      Legendary: "shadow-yellow-200/50",
      Unique: "shadow-red-200/50",
    };
    return glows[rarity as keyof typeof glows] || "";
  };

  const filteredItems = inventory.filter((item) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "consumables" && ["Food", "Potion"].includes(item.type)) ||
      (activeTab === "equipment" &&
        ["Equipment", "Weapon"].includes(item.type)) ||
      (activeTab === "fish" && item.type === "Fish") ||
      (activeTab === "special" &&
        ["Special", "Theme", "Collectible", "Style"].includes(item.type));

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch && item.quantity > 0;
  });

  const [dropdownState, setDropdownState] = useState<{
    isOpen: boolean;
    item: Item | null;
    position: { x: number; y: number } | null;
  }>({ isOpen: false, item: null, position: null });

  const handleItemClick = (
    item: Item,
    event: React.MouseEvent,
    itemIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Calculate position based on grid layout
    const gridCols = 5;
    const row = Math.floor(itemIndex / gridCols);
    const col = itemIndex % gridCols;

    // Position relative to the grid container
    const position = {
      x: col * 76 + 38, // 76px = item width + gap, 38px = center of item
      y: row * 76 + 80, // Position below the item
    };

    setDropdownState({ isOpen: true, item, position });
  };

  const handleUseItem = (item: Item) => {
    if (!activePet) {
      addNotification({
        type: "error",
        title: "No Pet Selected",
        message: "Please select an active pet first.",
        isRead: false,
      });
      return;
    }

    if (item.type === "Equipment" || item.type === "Weapon") {
      addNotification({
        type: "info",
        title: "Equipment Item",
        message:
          "Equipment items will be automatically equipped in future updates.",
        isRead: false,
      });
    } else {
      // Use the inventoryId instead of the universal item id
      if (!item.inventoryId) {
        addNotification({
          type: "error",
          title: "Invalid Item",
          message:
            "This item cannot be used. Please try refreshing your inventory.",
          isRead: false,
        });
        return;
      }
      useItem(item.inventoryId, activePet.id);
    }
  };

  const handleDiscardItem = (item: Item) => {
    if (item.inventoryId) {
      removeFromInventory(item.inventoryId, 1);
    } else {
      console.error("Item does not have inventoryId, falling back to item.id");
      removeFromInventory(item.id, 1);
    }

    addNotification({
      type: "warning",
      title: "Item Discarded",
      message: `${item.name} has been removed from your inventory.`,
      isRead: false,
    });
  };

  // Fish-specific handlers
  const handleFishInspect = (fishItem: Item) => {
    const result = fishingService.inspectFish(fishItem);
    if (result.success) {
      setFishInspectModal({ isOpen: true, fish: fishItem });
    } else {
      addNotification({
        type: "error",
        title: "Erro",
        message: result.message,
        isRead: false,
      });
    }
  };

  const handleFishFeed = (fishItem: Item) => {
    const result = fishingService.feedFish(fishItem);
    addNotification({
      type: result.success ? "success" : "error",
      title: result.success ? "Peixe Alimentado!" : "Erro",
      message: result.message,
      isRead: false,
    });
  };

  const handleFishDiscard = (fishItem: Item) => {
    handleDiscardItem(fishItem);
  };

  const getItemTypeColor = (type: string) => {
    const colors = {
      Food: "text-green-600",
      Potion: "text-blue-600",
      Equipment: "text-purple-600",
      Weapon: "text-red-600",
      Special: "text-yellow-600",
      Collectible: "text-pink-600",
      Style: "text-indigo-600",
      Theme: "text-orange-600",
    };
    return colors[type as keyof typeof colors] || "text-gray-600";
  };

  const maxSlots = 30;
  const usedSlots = filteredItems.length;

  const getSavedPosition = () => {
    const saved = localStorage.getItem(`modal-position-inventory`);
    if (saved) {
      return JSON.parse(saved);
    }
    return { x: 0, y: 0 };
  };

  React.useEffect(() => {
    if (isOpen) {
      setPosition(getSavedPosition());
    }
  }, [isOpen]);

  // Debug dropdown state
  React.useEffect(() => {
    console.log("Dropdown state changed:", dropdownState);
  }, [dropdownState]);

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    };
    setPosition(newPosition);
    localStorage.setItem(
      `modal-position-inventory`,
      JSON.stringify(newPosition),
    );
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  if (!isOpen) return null;

  // Show empty state if no items
  const emptyInventoryContent = (
    <div className="max-w-md mx-auto pb-12">
      <motion.div
        className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Empty Inventory
        </h2>
        <p className="text-gray-600 mb-6">
          Your inventory is empty. Explore the world, complete quests, and visit
          shops to collect items!
        </p>
        <motion.button
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            addNotification({
              type: "info",
              title: "Explore the World",
              message: "Visit shops and complete quests to find amazing items!",
              isRead: false,
            });
          }}
        >
          Start Exploring
        </motion.button>
      </motion.div>
    </div>
  );

  const inventoryContent = (
    <div className="max-w-md mx-auto pb-12 inventory-container relative">
      {/* Search Bar */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg mb-4 p-4 border border-gray-100"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex border-b border-gray-200">
          {tabs.map(({ id, name, icon: Icon, color }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-4 transition-all ${
                activeTab === id
                  ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{name}</span>
            </motion.button>
          ))}
        </div>

        {/* Inventory Grid */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {activeTab === "all"
                ? "All Items"
                : activeTab === "consumables"
                  ? "Food & Potions"
                  : activeTab === "equipment"
                    ? "Equipment & Weapons"
                    : activeTab === "fish"
                      ? "Fish Collection"
                      : "Special Items"}
            </h3>
            <div className="text-sm text-gray-500">
              {usedSlots}/{maxSlots} slots
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-4 relative">
            <AnimatePresence>
              {filteredItems.map((item, index) => {
                return (
                  <div key={item.inventoryId || item.id} className="relative">
                    <motion.button
                      onClick={(e) => handleItemClick(item, e, index)}
                      className={`relative aspect-square rounded-xl border-2 p-2 transition-all hover:scale-105 w-full ${getRarityColor(item.rarity)} ${getRarityGlow(item.rarity)} ${
                        item.isEquipped ? "ring-2 ring-blue-500" : ""
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Item Image */}
                      <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to emoji if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement!.innerHTML = `<span class="text-2xl">${getItemEmoji(item)}</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-2xl">{getItemEmoji(item)}</span>
                        )}
                      </div>

                      {/* Quantity */}
                      {item.quantity > 1 && (
                        <motion.span
                          className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                        >
                          {item.quantity > 99 ? "99+" : item.quantity}
                        </motion.span>
                      )}

                      {/* Equipped Indicator */}
                      {item.isEquipped && (
                        <motion.span
                          className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                        >
                          ✓
                        </motion.span>
                      )}

                      {/* Rarity Indicator */}
                      {item.rarity !== "Common" && (
                        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-current opacity-60"></div>
                      )}
                    </motion.button>
                  </div>
                );
              })}
            </AnimatePresence>

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, 15 - filteredItems.length) }).map(
              (_, index) => (
                <motion.div
                  key={`empty-${index}`}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.02 }}
                >
                  <Plus className="w-4 h-4 text-gray-300" />
                </motion.div>
              ),
            )}
          </div>

          {/* Inventory Stats */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredItems.length} items
            </span>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Storage: {Math.round((usedSlots / maxSlots) * 100)}%
              </span>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(usedSlots / maxSlots) * 100}%` }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Universal Item Dropdown */}
      <AnimatePresence>
        {dropdownState.isOpen && dropdownState.item && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[290]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setDropdownState({ isOpen: false, item: null, position: null })
              }
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[300] min-w-[200px]"
              style={{
                left: dropdownState.position
                  ? `${dropdownState.position.x}px`
                  : "50%",
                top: dropdownState.position
                  ? `${dropdownState.position.y}px`
                  : "50%",
                transform: "translateX(-50%)",
              }}
            >
              {/* Item Info Header */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {getItemEmoji(dropdownState.item)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {dropdownState.item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {dropdownState.item.rarity} • {dropdownState.item.type}
                      {dropdownState.item.type === "Fish" &&
                        dropdownState.item.fishData && (
                          <> • Tamanho {dropdownState.item.fishData.size}</>
                        )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1">
                {dropdownState.item.type === "Fish" ? (
                  <>
                    <button
                      onClick={() => {
                        handleFishInspect(dropdownState.item!);
                        setDropdownState({
                          isOpen: false,
                          item: null,
                          position: null,
                        });
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Package className="w-4 h-4 text-blue-500" />
                      <span>Inspecionar</span>
                    </button>

                    <button
                      onClick={() => {
                        handleFishFeed(dropdownState.item!);
                        setDropdownState({
                          isOpen: false,
                          item: null,
                          position: null,
                        });
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Utensils className="w-4 h-4 text-green-500" />
                      <span>Alimentar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleUseItem(dropdownState.item!);
                      setDropdownState({
                        isOpen: false,
                        item: null,
                        position: null,
                      });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>
                      {dropdownState.item.type === "Equipment" ||
                      dropdownState.item.type === "Weapon"
                        ? "Equipar"
                        : "Usar Item"}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    handleDiscardItem(dropdownState.item!);
                    setDropdownState({
                      isOpen: false,
                      item: null,
                      position: null,
                    });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Descartar</span>
                </button>
              </div>

              {/* Additional Info Footer */}
              {dropdownState.item.fishData && (
                <div className="px-3 py-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Pescado em{" "}
                    {dropdownState.item.fishData.caughtAt.toLocaleDateString(
                      "pt-BR",
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fish Inspect Modal */}
      <FishInspectModal
        fishItem={fishInspectModal.fish}
        isOpen={fishInspectModal.isOpen}
        onClose={() => setFishInspectModal({ isOpen: false, fish: null })}
        onFeed={handleFishFeed}
        onDiscard={handleFishDiscard}
      />
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 200 }}
        >
          {/* Close button */}
          <motion.button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors cursor-pointer z-10 pointer-events-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <X className="w-5 h-5 text-gray-600" />
          </motion.button>

          {/* Draggable inventory content */}
          <motion.div
            className="absolute pointer-events-auto w-full max-w-md"
            style={{
              left: "50%",
              top: "20%",
              transform: "translate(-50%, 0)",
            }}
            initial={{
              opacity: 0,
              scale: 0.95,
              x: position.x,
              y: position.y + 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: position.x,
              y: position.y,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              x: position.x,
              y: position.y - 20,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            drag={true}
            dragMomentum={false}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, cursor: "grabbing" }}
          >
            <div
              onMouseDown={(e) => {
                // Allow dragging only if clicked on non-interactive elements
                const target = e.target as HTMLElement;
                const isInteractive = target.closest(
                  'input, button, [role="button"], select, textarea, [contenteditable="true"]',
                );
                if (isInteractive) {
                  e.stopPropagation();
                }
              }}
            >
              {inventory.filter((item) => item.quantity > 0).length === 0
                ? emptyInventoryContent
                : inventoryContent}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Helper function to get item emoji fallback
const getItemEmoji = (item: Item) => {
  if (item.type === "Equipment") return "🛡️";
  if (item.type === "Weapon") return "⚔️";
  if (item.type === "Food") return "🍎";
  if (item.type === "Potion") return "🧪";
  if (item.type === "Fish") {
    if (item.fishData?.species === "Peixinho Azul") return "🐟";
    if (item.fishData?.species === "Peixinho Verde") return "🐠";
    return "🐟";
  }
  if (item.type === "Collectible") return "💎";
  if (item.type === "Special") return "✨";
  if (item.type === "Style") return "🎨";
  if (item.type === "Theme") return "🎭";
  return "📦";
};
