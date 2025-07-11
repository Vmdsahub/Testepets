import React, { useState, useRef, useEffect } from "react";
import { Heart, Globe, Package, User, Shield } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { motion } from "framer-motion";

const navigationItems = [
  { id: "pet", label: "Pet", icon: Heart, color: "rgb(236, 72, 153)" },
  { id: "world", label: "Mundo", icon: Globe, color: "rgb(59, 130, 246)" },
  {
    id: "inventory",
    label: "Inventário",
    icon: Package,
    color: "rgb(249, 115, 22)",
  },
  { id: "profile", label: "Perfil", icon: User, color: "rgb(147, 51, 234)" },
];

interface BottomPillNavigationProps {
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  openModals?: string[];
}

export const BottomPillNavigation: React.FC<BottomPillNavigationProps> = ({
  openModal,
  closeModal,
  closeAllModals,
  openModals = [],
}) => {
  const { currentScreen, setCurrentScreen, user, currentPlanet } =
    useGameStore();

  // Track the last world-related screen the user was on
  const lastWorldScreenRef = useRef<string>("world");

  // Update lastWorldScreen when user is on world or planet
  useEffect(() => {
    if (currentScreen === "world" || currentScreen === "planet") {
      lastWorldScreenRef.current = currentScreen;
    }
  }, [currentScreen]);

  // Add admin navigation for admin users
  const items = user?.isAdmin
    ? [
        ...navigationItems,
        {
          id: "admin",
          label: "Admin",
          icon: Shield,
          color: "rgb(239, 68, 68)",
        },
      ]
    : navigationItems;

  const handleItemClick = (id: string) => {
    if (id === "world") {
      // Close all modals when returning to world view
      closeAllModals();
      // Use the last world screen the user was on
      if (lastWorldScreenRef.current === "planet" && currentPlanet) {
        console.log(`🌍 Retornando ao planeta: ${currentPlanet.name}`);
        setCurrentScreen("planet");
      } else {
        console.log(`🌍 Retornando à navegação galáctica`);
        setCurrentScreen("world");
      }
    } else if (["pet", "inventory", "profile", "admin"].includes(id)) {
      // Toggle modal - open if closed, close if open
      if (openModals.includes(id)) {
        closeModal(id);
      } else {
        openModal(id);
      }
    } else {
      setCurrentScreen(id);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="bg-white/95 backdrop-blur-2xl rounded-full px-8 py-3 shadow-lg border border-gray-100/50"
        style={{
          width: "480px",
          height: "56px",
        }}
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          duration: 0.4,
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center space-x-2">
            {items.map(({ id, label, icon: Icon, color }) => {
              const isActive =
                currentScreen === id ||
                (id === "world" &&
                  (currentScreen === "world" || currentScreen === "planet")) ||
                (["pet", "inventory", "profile", "admin"].includes(id) &&
                  openModals.includes(id));

              return (
                <motion.button
                  key={id}
                  onClick={() => handleItemClick(id)}
                  className={`relative flex flex-col items-center justify-center px-6 py-2 rounded-full transition-all duration-300 ${
                    isActive ? "bg-gray-50" : "hover:bg-gray-50/50"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    className="relative"
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon
                      className="w-5 h-5 transition-colors duration-200"
                      style={{
                        color: isActive ? color : "rgb(107, 114, 128)",
                      }}
                    />
                  </motion.div>

                  <span
                    className={`text-xs font-medium mt-1 transition-all duration-200 ${
                      isActive
                        ? "text-gray-900 opacity-100"
                        : "text-gray-500 opacity-80"
                    }`}
                  >
                    {label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 w-1 h-1 rounded-full"
                      style={{ backgroundColor: color }}
                      layoutId="activeIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
