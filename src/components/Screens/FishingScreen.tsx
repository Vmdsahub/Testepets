import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Fish, Waves, Star, MapPin } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();

  return (
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
            {/* Location Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Águas Místicas dos Anciões
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Um local sagrado onde as águas cristalinas refletem os segredos
                do cosmos. Este templo ancestral guarda mistérios profundos nas
                suas correntes tranquilas.
              </p>
            </div>

            {/* Location Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <motion.div
                className="bg-blue-50 rounded-2xl p-6 border border-blue-100"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Waves className="w-6 h-6 text-blue-500" />
                  <h3 className="font-semibold text-gray-800">
                    Águas Sagradas
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Correntes de energia mística fluem através destas águas
                  ancestrais, carregando a sabedoria dos antigos.
                </p>
              </motion.div>

              <motion.div
                className="bg-cyan-50 rounded-2xl p-6 border border-cyan-100"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Star className="w-6 h-6 text-cyan-500" />
                  <h3 className="font-semibold text-gray-800">
                    Portal Celestial
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Durante certas fases lunares, um portal para outras dimensões
                  se manifesta nas profundezas.
                </p>
              </motion.div>
            </div>

            {/* Main Visual Area */}
            <div className="flex-1 bg-gradient-to-b from-sky-100 to-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-300/30">
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      "radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 60%)",
                      "radial-gradient(ellipse at 80% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 60%)",
                      "radial-gradient(ellipse at 50% 30%, rgba(168, 85, 247, 0.1) 0%, transparent 60%)",
                      "radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 60%)",
                    ],
                  }}
                  transition={{ duration: 12, repeat: Infinity }}
                />
              </div>

              {/* Floating Elements */}
              <motion.div
                className="absolute top-8 left-8 text-4xl opacity-40"
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, 0],
                }}
                transition={{ duration: 6, repeat: Infinity }}
              >
                ☁️
              </motion.div>

              <motion.div
                className="absolute top-12 right-12 text-3xl opacity-30"
                animate={{
                  y: [0, 8, 0],
                  rotate: [0, -3, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, delay: 2 }}
              >
                ✨
              </motion.div>

              <motion.div
                className="absolute bottom-12 left-16 text-2xl opacity-35"
                animate={{
                  x: [0, 10, 0],
                  y: [0, -5, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, delay: 4 }}
              >
                🌊
              </motion.div>

              {/* Center Content */}
              <div className="relative z-10 text-center">
                <motion.div
                  className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-lg max-w-md"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-6xl mb-4">🏛️</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    Templo em Meditação
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    As energias ancestrais deste local sagrado estão em estado
                    de contemplação profunda. Retorne quando as estrelas se
                    alinharem.
                  </p>

                  {/* Status Indicators */}
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span>Em Preparação</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Location Info */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Localização Mística
                  </h4>
                  <p className="text-sm text-blue-700">
                    Este templo ancestral permanece em estado de meditação
                    cósmica, aguardando o momento propício para revelar seus
                    segredos aos visitantes dignos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
