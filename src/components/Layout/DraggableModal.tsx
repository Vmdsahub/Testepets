import React, { useState, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { X } from "lucide-react";

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  modalId: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  zIndex?: number;
  onInteraction?: () => void;
  width?: number;
  height?: number;
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  modalId,
  defaultPosition = { x: 0, y: 0 },
  onPositionChange,
  zIndex = 200,
  onInteraction,
  width = 950,
  height = 750,
}) => {
  // Get saved position from localStorage or use center of screen
  const getSavedPosition = () => {
    const saved = localStorage.getItem(`modal-position-${modalId}`);
    if (saved) {
      return JSON.parse(saved);
    }
    // Center position - no offset needed as we use transform: translate(-50%, -50%)
    return { x: 0, y: 0 };
  };

  const [position, setPosition] = useState(getSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragStart = () => {
    setIsDragging(true);
    onInteraction?.(); // Bring modal to front when dragging starts
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    };
    setPosition(newPosition);
    // Save position to localStorage
    localStorage.setItem(
      `modal-position-${modalId}`,
      JSON.stringify(newPosition),
    );
    onPositionChange?.(newPosition);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleModalClick = () => {
    onInteraction?.(); // Bring modal to front when clicked
  };

  if (!isOpen) return null;

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
    >
      <motion.div
        className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        onClick={handleModalClick}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "95vw",
          maxHeight: "90vh",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        initial={{
          opacity: 0,
          scale: 0.8,
          x: position.x,
          y: position.y,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          x: position.x,
          y: position.y,
        }}
        exit={{
          opacity: 0,
          scale: 0.8,
          x: position.x,
          y: position.y,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.4,
        }}
        drag={true}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02 }}
      >
        {/* Header - Only show if title exists */}
        {title && (
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between select-none cursor-move">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Close button for headerless modals */}
        {!title && (
          <div className="absolute top-2 right-2 z-10">
            <motion.button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer bg-white shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </motion.div>
    </div>
  );
};
