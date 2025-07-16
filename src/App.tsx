import React, { useEffect, useMemo, memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthScreen } from "./components/Auth/AuthScreen";

import { TopBar } from "./components/Layout/TopBar";
import { BottomNavigation } from "./components/Layout/BottomNavigation";
import { TopPillNavigation } from "./components/Layout/TopPillNavigation";
import { BottomPillNavigation } from "./components/Layout/BottomPillNavigation";
import { ModalManager } from "./components/Layout/ModalManager";

import { StoreScreen } from "./components/Store/StoreScreen";
import { OtherUserInventoryScreen } from "./components/Screens/OtherUserInventoryScreen";
import { OtherUserAchievementsScreen } from "./components/Screens/OtherUserAchievementsScreen";
import { OtherUserCollectiblesScreen } from "./components/Screens/OtherUserCollectiblesScreen";
import { SpaceMap } from "./components/Game/SpaceMap";
import { PlanetScreen } from "./components/Screens/PlanetScreen";
import { ExplorationScreen } from "./components/Screens/ExplorationScreen";
import { FishingScreenModular as FishingScreen } from "./components/Screens/FishingScreenModular";
import { InventoryScreen } from "./components/Screens/InventoryScreen";
import { useAuthStore } from "./store/authStore";
import { useGameStore } from "./store/gameStore";
import { preloadAllSounds } from "./utils/soundManager";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import { MusicProvider } from "./contexts/MusicContext";
import { usePerformanceOptimization } from "./hooks/usePerformanceOptimization";

// Componente para pré-carregar recursos de áudio - memoizado para performance
const AudioPreloader: React.FC = memo(() => {
  useEffect(() => {
    // Pré-carrega todos os sons do jogo usando o SoundManager
    preloadAllSounds()
      .then(() =>
        console.log("🔊 Todos os sons foram pré-carregados com sucesso!"),
      )
      .catch((error) => console.error("❌ Erro ao pré-carregar sons:", error));
  }, []);

  return null; // Componente não renderiza nada
});

function App() {
  const { isAuthenticated, user: authUser, initializeAuth } = useAuthStore();
  const {
    currentScreen,
    currentPlanet,
    user: gameUser,
    pets,
    activePet,
    setUser,
    setCurrentScreen,
    setCurrentPlanet,
    setCurrentExplorationPoint,
    setCurrentExplorationArea,
    initializeNewUser,
    loadUserData,
    unsubscribeFromRealtimeUpdates,
  } = useGameStore();

  // Modal management state
  const [openModals, setOpenModals] = useState<string[]>([]);

  // Initialize background music
  const musicState = useBackgroundMusic();

  // Initialize performance optimizations
  usePerformanceOptimization({
    enableReducedMotion: true,
    enableCanvasOptimization: true,
    enableMemoryManagement: true,
    enableFPSMonitoring: false, // Enable only if needed for debugging
  });

  // Modal management functions
  const openModal = (modalId: string) => {
    setOpenModals((prev) => {
      if (!prev.includes(modalId)) {
        return [...prev, modalId];
      }
      return prev;
    });
  };

  const closeModal = (modalId: string) => {
    setOpenModals((prev) => prev.filter((id) => id !== modalId));
  };

  const closeAllModals = () => {
    setOpenModals([]);
  };

  // Initialize authentication on app start
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error("Auth initialization error:", error);
      }
    };
    init();
  }, []);

  // Enhanced sync logic with auth user and game user
  useEffect(() => {
    if (isAuthenticated && authUser) {
      const gameUserData = {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        phone: authUser.phone,
        isAdmin: authUser.isAdmin,
        language: authUser.language,
        accountScore: authUser.accountScore,
        daysPlayed: authUser.daysPlayed,
        totalXenocoins: authUser.totalXenocoins,
        createdAt: authUser.createdAt,
        lastLogin: authUser.lastLogin,
      };

      // Always update the user data and sync
      if (!gameUser || gameUser.id !== authUser.id) {
        // New user or different user
        initializeNewUser(gameUserData);
        loadUserData(authUser.id);
      } else {
        // Same user, update
        setUser(gameUserData);
      }
    } else if (!isAuthenticated && gameUser) {
      // User logged out, clear game data
      setUser(null);
    }
  }, [
    isAuthenticated,
    authUser?.id,
    authUser?.accountScore,
    authUser?.daysPlayed,
  ]);

  // Auto-start music when user accesses world for the first time (removed from auth)
  // Music will now only start when the user navigates to the world screen

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (isAuthenticated) {
        unsubscribeFromRealtimeUpdates();
      }
    };
  }, [isAuthenticated]);

  // Handle modal screen redirects
  useEffect(() => {
    if (
      isAuthenticated &&
      ["pet", "profile", "admin"].includes(currentScreen)
    ) {
      setCurrentScreen("world");
      setTimeout(() => openModal(currentScreen), 100);
    } else if (isAuthenticated && currentScreen === "inventory") {
      setCurrentScreen("world");
      // For inventory, we don't use the modal manager
      setTimeout(() => setOpenModals((prev) => [...prev, "inventory"]), 100);
    }
  }, [isAuthenticated, currentScreen]);

  // Note: Users can now freely navigate even without pets

  const renderScreen = useMemo(() => {
    console.log("🖥️ App.tsx renderScreen executado:", {
      currentScreen,
      currentPlanet,
      isAuthenticated,
    });
    if (!isAuthenticated) {
      console.log("🔒 Usuário não autenticado, mostrando AuthScreen");
      return <AuthScreen />;
    }

    console.log(
      "✅ Usuário autenticado, processando currentScreen:",
      currentScreen,
    );
    switch (currentScreen) {
      case "world":
        return (
          <>
            <SpaceMap />
            <ModalManager openModals={openModals} onCloseModal={closeModal} />
          </>
        );
      case "store":
        return <StoreScreen />;
      case "otherUserInventory":
        return <OtherUserInventoryScreen />;
      case "otherUserAchievements":
        return <OtherUserAchievementsScreen />;
      case "otherUserCollectibles":
        return <OtherUserCollectiblesScreen />;
      case "planet":
        console.log("📱 App.tsx: Renderizando PlanetScreen");
        return <PlanetScreen />;
      case "exploration":
        return <ExplorationScreen />;
      case "fishing":
        return <FishingScreen />;
      // Modal screens are now handled by ModalManager when on world screen
      case "pet":
      case "profile":
      case "admin":
        // Show SpaceMap while redirect is processing
        return (
          <>
            <SpaceMap />
            <ModalManager openModals={openModals} onCloseModal={closeModal} />
          </>
        );
      case "inventory":
        // Inventory is now a standalone modal
        return (
          <>
            <SpaceMap />
            <ModalManager
              openModals={openModals.filter((id) => id !== "inventory")}
              onCloseModal={closeModal}
            />
            <InventoryScreen
              isOpen={openModals.includes("inventory")}
              onClose={() => closeModal("inventory")}
            />
          </>
        );
      default:
        return <SpaceMap />;
    }
  }, [isAuthenticated, currentScreen, gameUser?.isAdmin, openModals]);

  const pageVariants = {
    initial: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      filter: "blur(4px)",
    },
    in: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    out: {
      opacity: 0,
      scale: 1.05,
      y: -20,
      filter: "blur(4px)",
    },
  };

  const pageTransition = {
    type: "spring",
    stiffness: 400,
    damping: 25,
    mass: 0.6,
    velocity: 2,
  };

  // If not authenticated, just return the auth screen directly
  if (!isAuthenticated) {
    return renderScreen;
  }

  return (
    <MusicProvider musicState={musicState}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 gpu-accelerated force-gpu-layer">
        <AudioPreloader />

        {/* Emergency Navigation Button */}
        {isAuthenticated && currentScreen !== "world" && (
          <button
            onClick={() => {
              setCurrentScreen("world");
              // Also clear any stuck exploration state
              setCurrentExplorationPoint(null);
              setCurrentExplorationArea(null);
              setCurrentPlanet(null);
            }}
            className="fixed top-4 left-4 z-[9999] bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-lg transition-colors font-bold text-sm"
            style={{ zIndex: 99999 }}
          >
            🚨 VOLTAR AO MAPA
          </button>
        )}

        {["world", "planet", "exploration", "fishing"].includes(
          currentScreen,
        ) ? (
          // Fullscreen layout for world-related screens with pill navigations
          <div className="fixed inset-0 overflow-hidden">
            <TopPillNavigation
              openModal={openModal}
              closeModal={closeModal}
              openModals={openModals}
            />
            <BottomPillNavigation
              openModal={openModal}
              closeModal={closeModal}
              closeAllModals={closeAllModals}
              openModals={openModals}
            />
            <div className="h-full w-full">
              {currentScreen === "world" && <SpaceMap />}
              {currentScreen === "planet" && <PlanetScreen />}
              {currentScreen === "exploration" && <ExplorationScreen />}
              {currentScreen === "fishing" && <FishingScreen />}
            </div>
            {/* Modals persist outside AnimatePresence */}
            <ModalManager
              openModals={openModals.filter((id) => id !== "inventory")}
              onCloseModal={closeModal}
            />
            <InventoryScreen
              isOpen={openModals.includes("inventory")}
              onClose={() => closeModal("inventory")}
            />
          </div>
        ) : (
          // Normal layout for other screens with traditional navigation
          <>
            <TopBar />
            <main className="pt-20 pb-8 px-4 min-h-screen composite-layer force-gpu-layer">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen}
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="smooth-page-transition force-gpu-layer"
                >
                  {renderScreen}
                </motion.div>
              </AnimatePresence>
            </main>
            <BottomNavigation />
          </>
        )}
      </div>
    </MusicProvider>
  );
}

export default App;
