import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DraggableModal } from "./DraggableModal";
import { PetScreen } from "../Screens/PetScreen";

import { ProfileScreen } from "../Screens/ProfileScreen";
import { AdminPanel } from "../Admin/AdminPanel";
import { NotificationsModal } from "./NotificationsModal";
import { MusicModal } from "./MusicModal";
import { useGameStore } from "../../store/gameStore";

interface ModalConfig {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface ModalManagerProps {
  openModals: string[];
  onCloseModal: (modalId: string) => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  openModals,
  onCloseModal,
}) => {
  const { user } = useGameStore();
  // Keep track of modal order - last in array = highest z-index
  const [modalOrder, setModalOrder] = useState<string[]>([]);

  // Update modal order when openModals changes
  React.useEffect(() => {
    // Remove closed modals from order
    const validOrder = modalOrder.filter((id) => openModals.includes(id));

    // Add new modals to the end (making them top)
    const newModals = openModals.filter((id) => !validOrder.includes(id));
    const updatedOrder = [...validOrder, ...newModals];

    setModalOrder(updatedOrder);
  }, [openModals]);

  const handleModalInteraction = (modalId: string) => {
    // Move interacted modal to end (top)
    setModalOrder((prev) => {
      const filtered = prev.filter((id) => id !== modalId);
      return [...filtered, modalId];
    });
  };

  const getZIndex = (modalId: string) => {
    const index = modalOrder.indexOf(modalId);
    return 200 + index; // Base 200, each modal gets +1
  };

  const getModalSize = (modalId: string) => {
    const sizes = {
      pet: { width: 712, height: 750 }, // -25% horizontal (950 * 0.75 = 712)
      profile: { width: 712, height: 750 }, // -25% horizontal (950 * 0.75 = 712)
      admin: { width: 950, height: 750 }, // Manter tamanho original
      notifications: { width: 380, height: 500 }, // Compact size for notifications
      music: { width: 300, height: 180 }, // Compact minimalist size
    };
    return sizes[modalId as keyof typeof sizes] || { width: 950, height: 750 };
  };

  const modalConfigs: ModalConfig[] = [
    {
      id: "pet",
      title: "Meus Pets",
      component: <PetScreen />,
    },
    {
      id: "profile",
      title: "Perfil",
      component: <ProfileScreen />,
    },
    {
      id: "notifications",
      title: "Notificações",
      component: <NotificationsModal />,
    },
    {
      id: "music",
      title: "",
      component: <MusicModal />,
    },
    ...(user?.isAdmin
      ? [
          {
            id: "admin",
            title: "Painel Admin",
            component: <AdminPanel />,
          },
        ]
      : []),
  ];

  const getModalPosition = (modalId: string, index: number) => {
    // Check if there's a saved position
    const saved = localStorage.getItem(`modal-position-${modalId}`);
    if (saved) {
      return JSON.parse(saved);
    }

    // If no saved position, always return center (0,0)
    // This will make all modals appear in the center on first open
    return { x: 0, y: 0 };
  };

  return (
    <AnimatePresence>
      {modalConfigs.map((config, index) => {
        const isOpen = openModals.includes(config.id);
        if (!isOpen) return null;

        const modalSize = getModalSize(config.id);

        return (
          <DraggableModal
            key={config.id}
            isOpen={isOpen}
            onClose={() => onCloseModal(config.id)}
            title={config.title}
            modalId={config.id}
            defaultPosition={getModalPosition(config.id, index)}
            zIndex={getZIndex(config.id)}
            onInteraction={() => handleModalInteraction(config.id)}
            width={modalSize.width}
            height={modalSize.height}
          >
            {config.component}
          </DraggableModal>
        );
      })}
    </AnimatePresence>
  );
};
