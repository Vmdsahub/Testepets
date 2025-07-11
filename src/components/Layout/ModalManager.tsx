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
          >
            {config.component}
          </DraggableModal>
        );
      })}
    </AnimatePresence>
  );
};
