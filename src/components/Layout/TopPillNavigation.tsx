import React, { useState, useCallback, useMemo } from "react";
import { Bell, Calendar, Music } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { MonthlyCalendar } from "../CheckIn/MonthlyCalendar";

interface TopPillNavigationProps {
  openModal?: (modalId: string) => void;
  closeModal?: (modalId: string) => void;
  openModals?: string[];
}

export const TopPillNavigation: React.FC<TopPillNavigationProps> = ({
  openModal,
  closeModal,
  openModals = [],
}) => {
  const {
    user,
    xenocoins,
    cash,
    notifications,
    markAllNotificationsAsRead,
    canClaimDailyCheckin,
  } = useGameStore();

  const [showCheckin, setShowCheckin] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );
  const showNotifications = openModals.includes("notifications");
  const showMusicModal = openModals.includes("music");

  const handleBellClick = useCallback(() => {
    if (unreadCount > 0 && !showNotifications) {
      markAllNotificationsAsRead();
    }
    if (showNotifications) {
      closeModal?.("notifications");
    } else {
      openModal?.("notifications");
    }
  }, [
    unreadCount,
    showNotifications,
    markAllNotificationsAsRead,
    closeModal,
    openModal,
  ]);

  const handleMusicClick = useCallback(() => {
    if (showMusicModal) {
      closeModal?.("music");
    } else {
      openModal?.("music");
    }
  }, [showMusicModal, closeModal, openModal]);

  const canClaimDaily = useMemo(
    () => canClaimDailyCheckin(),
    [canClaimDailyCheckin],
  );

  return (
    <>
      {/* Minimalist top pill navigation */}
      <div className="fixed top-3 sm:top-6 left-1/2 transform -translate-x-1/2 z-50 px-4 sm:px-0">
        <motion.div
          className="bg-white/95 backdrop-blur-2xl rounded-full px-4 sm:px-12 py-2 sm:py-3 shadow-lg border border-gray-100/50 w-full sm:w-auto"
          style={{
            minWidth: window.innerWidth >= 640 ? "600px" : "280px",
            width: "100%",
            height: "48px",
          }}
          data-responsive="true"
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            duration: 0.4,
          }}
        >
          <div className="flex items-center justify-between h-full">
            {/* Profile Section */}
            <motion.div
              className="flex items-center space-x-2 sm:space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-medium text-xs sm:text-sm">
                    {user?.username?.charAt(0) || "P"}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            </motion.div>

            {/* Currencies Section */}
            <div className="flex items-center space-x-2 sm:space-x-8">
              {/* Xenocoins */}
              <motion.div
                className="flex items-center space-x-1 sm:space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Ff481900009a94cda953c032479392a30%2F3e6c6cb85c6a4d2ba05acb245bfbc214?format=webp&width=800"
                  alt="Xenocoins"
                  className="w-4 h-4 sm:w-6 sm:h-6"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">
                  {xenocoins > 9999
                    ? `${Math.floor(xenocoins / 1000)}k`
                    : xenocoins.toLocaleString()}
                </span>
              </motion.div>

              {/* Cash */}
              <motion.div
                className="flex items-center space-x-1 sm:space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fc013caa4db474e638dc2961a6085b60a%2F38a7eab3791441c7bc853afba8904317?format=webp&width=800"
                  alt="Xenocash"
                  className="w-4 h-4 sm:w-6 sm:h-6"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 hidden xs:inline">
                  {cash > 9999 ? `${Math.floor(cash / 1000)}k` : cash}
                </span>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Daily Check-in */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowCheckin(!showCheckin)}
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                    canClaimDaily
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  {canClaimDaily && (
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    />
                  )}
                </motion.button>

                <AnimatePresence>
                  {showCheckin && (
                    <div className="absolute top-full right-0 mt-2 z-50">
                      <MonthlyCalendar onClose={() => setShowCheckin(false)} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Music */}
              <motion.button
                onClick={handleMusicClick}
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                  showMusicModal
                    ? "bg-blue-50 text-blue-600"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Music className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.button>

              {/* Notifications */}
              <div className="relative">
                <motion.button
                  onClick={handleBellClick}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-all duration-200 relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                  {unreadCount > 0 && (
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.div>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
