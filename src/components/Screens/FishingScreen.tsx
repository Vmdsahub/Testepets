import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Fish } from "lucide-react";
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

          {/* Image Field - Same size as Vila Ancestral */}
          <div className="p-4">
            <div className="w-full h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-340px)] relative rounded-2xl overflow-hidden">
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                src="https://cdn.builder.io/o/assets%2Fae8512d3d0df4d1f8f1504a06406c6ba%2Ff77cfd79857a4ff1ab7f3f87dcf3c894?alt=media&token=1b203314-d947-47e5-a1c9-8a533d34482d&apiKey=ae8512d3d0df4d1f8f1504a06406c6ba"
                alt={`Templo dos Anciões`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
