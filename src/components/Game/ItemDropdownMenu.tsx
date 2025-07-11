import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Eye, Play, Trash2 } from "lucide-react";

interface ItemDropdownMenuProps {
  onInspect: () => void;
  onUse: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const ItemDropdownMenu: React.FC<ItemDropdownMenuProps> = ({
  onInspect,
  onUse,
  onDiscard,
  disabled = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      action();
      setIsOpen(false);
    };
  };

  return (
    <div className="relative" ref={menuRef}>
      {children ? (
        <div onClick={() => setIsOpen(!isOpen)}>{children}</div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          disabled={disabled}
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]"
          >
            <button
              onClick={handleAction(onInspect)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Inspecionar
            </button>
            <button
              onClick={handleAction(onUse)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={disabled}
            >
              <Play className="w-4 h-4" />
              Usar
            </button>
            <button
              onClick={handleAction(onDiscard)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Descartar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
