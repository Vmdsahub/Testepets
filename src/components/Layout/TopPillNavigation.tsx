import React, { useState } from "react";
import { Bell, Calendar, Music, X, Trash2 } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { MusicMiniModal } from "../Audio/MusicMiniModal";
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
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    canClaimDailyCheckin,
  } = useGameStore();

  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleBellClick = () => {
    if (unreadCount > 0 && !showNotifications) {
      markAllNotificationsAsRead();
    }
    setShowNotifications(!showNotifications);
  };

  const handleDeleteNotification = (
    event: React.MouseEvent,
    notificationId: string,
  ) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const canClaimDaily = canClaimDailyCheckin();

  return (
    <>
      {/* Minimalist top pill navigation */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <motion.div
          className="bg-white/95 backdrop-blur-2xl rounded-full px-8 py-3 shadow-lg border border-gray-100/50"
          style={{
            width: "480px",
            height: "56px",
          }}
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
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-medium text-sm">
                    {user?.username?.charAt(0) || "P"}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            </motion.div>

            {/* Currencies Section */}
            <div className="flex items-center space-x-6">
              {/* Xenocoins */}
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Ff481900009a94cda953c032479392a30%2F3e6c6cb85c6a4d2ba05acb245bfbc214?format=webp&width=800"
                  alt="Xenocoins"
                  className="w-6 h-6"
                />
                <span className="text-sm font-semibold text-gray-700">
                  {xenocoins > 9999
                    ? `${Math.floor(xenocoins / 1000)}k`
                    : xenocoins.toLocaleString()}
                </span>
              </motion.div>

              {/* Cash */}
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fc013caa4db474e638dc2961a6085b60a%2F38a7eab3791441c7bc853afba8904317?format=webp&width=800"
                  alt="Xenocash"
                  className="w-6 h-6"
                />
                <span className="text-sm font-semibold text-gray-700">
                  {cash > 9999 ? `${Math.floor(cash / 1000)}k` : cash}
                </span>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Daily Check-in */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowCheckin(!showCheckin)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                    canClaimDaily
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Calendar className="w-4 h-4" />
                  {canClaimDaily && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"
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
                onClick={() => setShowMusicModal(!showMusicModal)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                  showMusicModal
                    ? "bg-blue-50 text-blue-600"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Music className="w-4 h-4" />
              </motion.button>

              {/* Notifications */}
              <div className="relative">
                <motion.button
                  onClick={handleBellClick}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-all duration-200 relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
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

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/10 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
            />
            <motion.div
              className="fixed top-20 right-6 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-[70vh] flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-50">
                <h3 className="font-semibold text-gray-900">Notificações</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => clearNotifications()}
                    className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                    title="Limpar todas"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-25 transition-colors ${
                        notification.isRead ? "opacity-60" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2 ml-3">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <button
                            onClick={(e) =>
                              handleDeleteNotification(e, notification.id)
                            }
                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Music Mini Modal */}
      <MusicMiniModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
      />
    </>
  );
};
