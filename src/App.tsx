import React, { useEffect, useMemo, memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthScreen } from "./components/Auth/AuthScreen";

import { TopBar } from "./components/Layout/TopBar";
import { BottomNavigation } from "./components/Layout/BottomNavigation";
import { TopPillNavigation } from "./components/Layout/TopPillNavigation";
import { BottomPillNavigation } from "./components/Layout/BottomPillNavigation";
import { ModalManager } from "./components/Layout/ModalManager";

import { PetScreen } from "./components/Screens/PetScreen";
import { StoreScreen } from "./components/Store/StoreScreen";
import { InventoryScreen } from "./components/Screens/InventoryScreen";
import { ProfileScreen } from "./components/Screens/ProfileScreen";
import { OtherUserInventoryScreen } from "./components/Screens/OtherUserInventoryScreen";
import { OtherUserAchievementsScreen } from "./components/Screens/OtherUserAchievementsScreen";
import { OtherUserCollectiblesScreen } from "./components/Screens/OtherUserCollectiblesScreen";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { SpaceMap } from "./components/Game/SpaceMap";
import { PlanetScreen } from "./components/Screens/PlanetScreen";
import { ExplorationScreen } from "./components/Screens/ExplorationScreen";
import { useAuthStore } from "./store/authStore";
import { useGameStore } from "./store/gameStore";
import { preloadAllSounds } from "./utils/soundManager";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import { MusicProvider } from "./contexts/MusicContext";

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
    user: gameUser,
    setUser,
    initializeNewUser,
    loadUserData,
    unsubscribeFromRealtimeUpdates,
  } = useGameStore();

  // Modal management state
  const [openModals, setOpenModals] = useState<string[]>([]);
  const [modalOriginPositions, setModalOriginPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Initialize background music
  const musicState = useBackgroundMusic();

  // Modal management functions
  const openModal = (
    modalId: string,
    originPosition?: { x: number; y: number },
  ) => {
    setOpenModals((prev) => {
      if (!prev.includes(modalId)) {
        return [...prev, modalId];
      }
      return prev;
    });

    if (originPosition) {
      setModalOriginPositions((prev) => ({
        ...prev,
        [modalId]: originPosition,
      }));
    }
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

  const renderScreen = useMemo(() => {
    if (!isAuthenticated) {
      return <AuthScreen />;
    }

    switch (currentScreen) {
      case "world":
        return (
          <>
            <SpaceMap />
            <ModalManager
              openModals={openModals}
              onCloseModal={closeModal}
              modalOriginPositions={modalOriginPositions}
            />
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
        return <PlanetScreen />;
      case "exploration":
        return <ExplorationScreen />;
      // Modal screens are now handled by ModalManager when on world screen
      case "pet":
      case "inventory":
      case "profile":
      case "admin":
        // Auto-redirect to world and open the modal
        setCurrentScreen("world");
        setTimeout(() => openModal(currentScreen), 100);
        return (
          <>
            <SpaceMap />
            <ModalManager
              openModals={openModals}
              onCloseModal={closeModal}
              modalOriginPositions={modalOriginPositions}
            />
          </>
        );
      default:
        return <SpaceMap />;
    }
  }, [isAuthenticated, currentScreen, gameUser?.isAdmin, openModals]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4,
  };

  // If not authenticated, just return the auth screen directly
  if (!isAuthenticated) {
    return renderScreen;
  }

  return (
    <MusicProvider musicState={musicState}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 gpu-accelerated force-gpu-layer">
        <AudioPreloader />

        {currentScreen === "world" ? (
          // Fullscreen layout for world screen with pill navigations
          <div className="fixed inset-0 overflow-hidden">
            <TopPillNavigation />
            <BottomPillNavigation
              openModal={openModal}
              closeModal={closeModal}
              closeAllModals={closeAllModals}
              openModals={openModals}
            />
            {renderScreen}
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
                  className="smooth-animation force-gpu-layer"
                  style={{
                    transform: "translate3d(0, 0, 0)",
                    willChange: "transform, opacity",
                  }}
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
