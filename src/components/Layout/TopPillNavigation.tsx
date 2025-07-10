import React, { useState } from "react";
import { Bell, Calendar, Music, X, Trash2 } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { MusicMiniModal } from "../Audio/MusicMiniModal";
import { MonthlyCalendar } from "../CheckIn/MonthlyCalendar";

export const TopPillNavigation: React.FC = () => {
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
      {/* Top pill navigation */}
      <div className="fixed top-3 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 px-2 sm:px-4">
        <motion.div
          className="bg-white/90 backdrop-blur-xl rounded-full px-6 sm:px-8 lg:px-10 py-2 shadow-2xl border border-white/20 min-w-[400px] max-w-[600px] w-auto"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="flex items-center justify-between space-x-4">
            {/* Profile */}
            <div className="flex items-center">
              <div className="relative">
                <div className="w-7 h-7 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xs">
                    {user?.username?.charAt(0) || "P"}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            </div>

            {/* Currencies */}
            <div className="flex items-center space-x-4">
              {/* Xenocoins */}
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.02 }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Ff481900009a94cda953c032479392a30%2F3e6c6cb85c6a4d2ba05acb245bfbc214?format=webp&width=800"
                  alt="Xenocoins"
                  className="w-5 h-5"
                />
                <span className="text-sm font-semibold text-yellow-600">
                  {xenocoins > 9999
                    ? `${Math.floor(xenocoins / 1000)}k`
                    : xenocoins.toLocaleString()}
                </span>
              </motion.div>

              {/* Cash */}
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.02 }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fc013caa4db474e638dc2961a6085b60a%2F38a7eab3791441c7bc853afba8904317?format=webp&width=800"
                  alt="Xenocash"
                  className="w-5 h-5"
                />
                <span className="text-sm font-semibold text-green-600">
                  {cash > 9999 ? `${Math.floor(cash / 1000)}k` : cash}
                </span>
              </motion.div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              {/* Daily Check-in */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowCheckin(!showCheckin)}
                  className={`p-2 rounded-full transition-colors relative ${
                    canClaimDaily
                      ? "bg-blue-100/80 hover:bg-blue-200/80 text-blue-600"
                      : "hover:bg-gray-100/80 text-gray-600"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Calendar className="w-4 h-4" />
                  {canClaimDaily && (
                    <motion.span
                      className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      !
                    </motion.span>
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
                className={`p-2 rounded-full transition-colors ${
                  showMusicModal
                    ? "bg-blue-100/80 text-blue-600"
                    : "hover:bg-gray-100/80 text-gray-600"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Music className="w-4 h-4" />
              </motion.button>

              {/* Notifications */}
              <div className="relative">
                <motion.button
                  onClick={handleBellClick}
                  className="p-2 hover:bg-gray-100/80 rounded-full transition-colors relative text-gray-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
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
              className="fixed inset-0 bg-black/20 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
            />
            <motion.div
              className="fixed top-20 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[70vh] flex flex-col"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notificações</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => clearNotifications()}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Limpar todas"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        notification.isRead ? "opacity-70" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ x: 5 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <button
                            onClick={(e) =>
                              handleDeleteNotification(e, notification.id)
                            }
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
