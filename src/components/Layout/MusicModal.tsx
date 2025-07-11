import React from "react";
import { MusicMiniModal } from "../Audio/MusicMiniModal";

interface MusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicModal: React.FC<MusicModalProps> = ({ isOpen, onClose }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <MusicMiniModal isOpen={isOpen} onClose={onClose} />
    </div>
  );
};
