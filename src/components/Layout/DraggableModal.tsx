import React, { useState, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { X, Maximize2, Minimize2 } from "lucide-react";

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  modalId: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  originPosition?: { x: number; y: number };
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  modalId,
  defaultPosition = { x: 0, y: 0 },
  onPositionChange,
  originPosition,
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
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragStart = () => {
    setIsDragging(true);
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

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 z-[200] pointer-events-none"
    >
      <motion.div
        className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{
          width: isMaximized ? "95vw" : "950px",
          height: isMaximized ? "90vh" : "750px",
          maxWidth: isMaximized ? "none" : "95vw",
          maxHeight: isMaximized ? "none" : "90vh",
          left: isMaximized ? "2.5vw" : "50%",
          top: isMaximized ? "5vh" : "50%",
          transform: isMaximized ? "none" : "translate(-50%, -50%)",
        }}
        initial={{
          opacity: 0,
          scale: getInitialScale(),
          x: getInitialPosition().x,
          y: getInitialPosition().y,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          x: isMaximized ? 0 : position.x,
          y: isMaximized ? 0 : position.y,
        }}
        exit={{
          opacity: 0,
          scale: 0.2,
          x: originPosition
            ? originPosition.x - window.innerWidth / 2
            : position.x,
          y: originPosition
            ? originPosition.y - window.innerHeight / 2
            : position.y,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          duration: 0.5,
        }}
        drag={!isMaximized}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02, zIndex: 300 }}
      >
        {/* Header */}
        <div
          className={`bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between select-none ${
            !isMaximized ? "cursor-move" : "cursor-default"
          }`}
        >
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={toggleMaximize}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 text-gray-500" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-500" />
              )}
            </motion.button>
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

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">{children}</div>
        </div>
      </motion.div>
    </div>
  );
};
