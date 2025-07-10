import React, { useState, useRef, useEffect } from "react";
import { Heart, Globe, Package, User, Shield, Music } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { motion } from "framer-motion";

const navigationItems = [
  { id: "pet", label: "Pet", icon: Heart },
  { id: "world", label: "Mundo", icon: Globe },
  { id: "inventory", label: "Inventário", icon: Package },
  { id: "profile", label: "Perfil", icon: User },
];

export const BottomPillNavigation: React.FC = () => {
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
    ? [...navigationItems, { id: "admin", label: "Admin", icon: Shield }]
    : navigationItems;

  const handleItemClick = (id: string) => {
    if (id === "world") {
      // Use the last world screen the user was on
      if (lastWorldScreenRef.current === "planet" && currentPlanet) {
        console.log(`🌍 Retornando ao planeta: ${currentPlanet.name}`);
        setCurrentScreen("planet");
      } else {
        console.log(`🌍 Retornando à navegação galáctica`);
        setCurrentScreen("world");
      }
    } else {
      setCurrentScreen(id);
    }
  };

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-2 sm:px-4">
      <motion.div
        className="bg-white/90 backdrop-blur-xl rounded-full px-6 sm:px-8 lg:px-10 py-2 shadow-2xl border border-white/20 min-w-[400px] max-w-[600px] w-auto"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-center space-x-2">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive =
              currentScreen === id ||
              (id === "world" &&
                (currentScreen === "world" || currentScreen === "planet"));

            return (
              <motion.button
                key={id}
                onClick={() => handleItemClick(id)}
                className={`flex flex-col items-center px-4 py-2 rounded-full transition-all duration-200 ${
                  isActive ? "bg-white shadow-md" : "hover:bg-white/50"
                } ${id === "admin" ? "relative" : ""}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className={`${
                    isActive
                      ? id === "pet"
                        ? "text-pink-500"
                        : id === "world"
                          ? "text-blue-500"
                          : id === "inventory"
                            ? "text-orange-500"
                            : id === "profile"
                              ? "text-purple-500"
                              : id === "admin"
                                ? "text-red-500"
                                : "text-blue-500"
                      : "text-gray-500"
                  }`}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span
                  className={`text-xs font-medium mt-1 transition-colors ${
                    isActive ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    className={`w-1 h-1 rounded-full mt-1 ${
                      id === "admin" ? "bg-red-500" : "bg-blue-500"
                    }`}
                    layoutId="activeIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
