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
    // Stagger the initial positions so modals don't overlap
    const baseOffset = index * 50;
    const positions: Record<string, { x: number; y: number }> = {
      pet: { x: -200 + baseOffset, y: -100 + baseOffset },
      inventory: { x: 200 + baseOffset, y: -100 + baseOffset },
      profile: { x: -200 + baseOffset, y: 100 + baseOffset },
      admin: { x: 200 + baseOffset, y: 100 + baseOffset },
    };
    return positions[modalId] || { x: baseOffset, y: baseOffset };
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
            defaultPosition={getModalPosition(config.id, index)}
          >
            {config.component}
          </DraggableModal>
        );
      })}
    </AnimatePresence>
  );
};
