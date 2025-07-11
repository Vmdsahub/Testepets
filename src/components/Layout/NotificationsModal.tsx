import React from "react";
import { motion } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

export const NotificationsModal: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    deleteNotification,
    clearNotifications,
  } = useGameStore();

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId);
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

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header with clear all button */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">
          {notifications.length} notificação
          {notifications.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => clearNotifications()}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          title="Limpar todas"
        >
          <Trash2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Notification List */}
      <div className="flex-1 space-y-2">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <motion.div
              key={notification.id}
              className={`p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
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
    </div>
  );
};
