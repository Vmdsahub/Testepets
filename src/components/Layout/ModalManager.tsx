import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DraggableModal } from "./DraggableModal";
import { PetScreen } from "../Screens/PetScreen";
import { InventoryScreen } from "../Screens/InventoryScreen";
import { ProfileScreen } from "../Screens/ProfileScreen";
import { AdminPanel } from "../Admin/AdminPanel";
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
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  // When a new modal opens, make it active
  React.useEffect(() => {
    if (openModals.length > 0) {
      const lastOpenedModal = openModals[openModals.length - 1];
      if (!activeModalId || !openModals.includes(activeModalId)) {
        setActiveModalId(lastOpenedModal);
      }
    } else {
      setActiveModalId(null);
    }
  }, [openModals, activeModalId]);

  const handleModalInteraction = (modalId: string) => {
    setActiveModalId(modalId);
  };

  const modalConfigs: ModalConfig[] = [
    {
      id: "pet",
      title: "Meus Pets",
      component: <PetScreen />,
    },
    {
      id: "inventory",
      title: "Inventário",
      component: <InventoryScreen />,
    },
    {
      id: "profile",
      title: "Perfil",
      component: <ProfileScreen />,
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

        const isActive = activeModalId === config.id;
        const zIndex = isActive ? 250 : 200; // Active modal gets higher z-index

        return (
          <DraggableModal
            key={config.id}
            isOpen={isOpen}
            onClose={() => onCloseModal(config.id)}
            title={config.title}
            modalId={config.id}
            defaultPosition={getModalPosition(config.id, index)}
            zIndex={zIndex}
            onInteraction={() => handleModalInteraction(config.id)}
          >
            {config.component}
          </DraggableModal>
        );
      })}
    </AnimatePresence>
  );
};
