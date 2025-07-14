import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Fish, Waves } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { FishingGameModal } from "../Game/FishingGameModal";

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();
  const [showFishingGame, setShowFishingGame] = useState(false);

  return (
    <>
      {/* Main Screen Layout following Planet Screen pattern */}
      <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-700 pt-20 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <motion.button
            onClick={() => setCurrentScreen("exploration")}
            className="mb-6 bg-white/20 backdrop-blur text-white p-3 rounded-full hover:bg-white/30 transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </motion.button>

          {/* Main Content Window */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl overflow-hidden"
            style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Fish className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Templo dos Anciões</h1>
                  <p className="text-blue-100">Local sagrado de pesca mística</p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 h-full flex flex-col">
              {/* Description */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Águas Místicas dos Anciões
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Nas águas cristalinas do Templo dos Anciões habita o lendário 
                  <strong className="text-blue-600"> Peixe Místico</strong>, uma criatura 
                  sagrada que concede recompensas valiosas aos pescadores dignos.
                </p>
              </div>

              {/* Game Preview */}
              <div className="flex-1 bg-gradient-to-b from-sky-100 to-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Animated Water Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-300/30">
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        "radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)",
                        "radial-gradient(ellipse at 80% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                        "radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)"
                      ]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                  />
                </div>

                {/* Cloud decorations */}
                <motion.div
                  className="absolute top-4 left-8 text-4xl opacity-60"
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 8, repeat: Infinity }}
                >
                  ☁️
                </motion.div>
                <motion.div
                  className="absolute top-8 right-12 text-3xl opacity-50"
                  animate={{ x: [0, -8, 0] }}
                  transition={{ duration: 10, repeat: Infinity }}
                >
                  ☁️
                </motion.div>

                {/* Center Content */}
                <div className="relative z-10 text-center">
                  <motion.div
                    className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-lg"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-6xl mb-4">🎣</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Pesca Mística
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Teste suas habilidades nas águas sagradas
                    </p>
                    
                    {/* Game Features */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Waves className="w-6 h-6 text-blue-500" />
                        <span className="text-gray-700">Águas WebGL</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <Fish className="w-6 h-6 text-cyan-500" />
                        <span className="text-gray-700">Peixe Místico</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">💎</span>
                        <span className="text-gray-700">Recompensas</span>
                      </div>
                    </div>

                    {/* Play Button */}
                    <motion.button
                      onClick={() => setShowFishingGame(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Começar Pesca
                    </motion.button>
                  </div>
                </div>

                {/* Decorative Fish */}
                <motion.div
                  className="absolute bottom-8 left-1/4 text-4xl opacity-30"
                  animate={{
                    x: [0, 20, 0],
                    y: [0, -5, 0],
                    rotate: [0, 10, 0]
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  🐟
                </motion.div>
                <motion.div
                  className="absolute bottom-12 right-1/3 text-3xl opacity-25"
                  animate={{
                    x: [0, -15, 0],
                    y: [0, 3, 0],
                    rotate: [0, -8, 0]
                  }}
                  transition={{ duration: 8, repeat: Infinity, delay: 2 }}
                >
                  🐠
                </motion.div>
              </div>

              {/* Tips */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Dicas de Pesca:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Clique nas águas para lançar o anzol</li>
                  <li>• Mire próximo ao peixe para maior chance de captura</li>
                  <li>• Cada peixe capturado rende 100 pontos + Xenocoins</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fishing Game Modal */}
      {showFishingGame && (
        <FishingGameModal onClose={() => setShowFishingGame(false)} />
      )}
    </>
  );
};