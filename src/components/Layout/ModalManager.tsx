import React from "react";
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

    // If no saved position, stagger slightly to avoid complete overlap if multiple modals open
    const offset = index * 30;
    return { x: offset, y: offset };
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
          >
            {config.component}
          </DraggableModal>
        );
      })}
    </AnimatePresence>
  );
};
