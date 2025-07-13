import React from "react";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

export const FishingScreen: React.FC = () => {
  const { setCurrentScreen } = useGameStore();

  return (
    <div className="w-full h-screen bg-blue-900 flex items-center justify-center relative">
      {/* Back button */}
      <button
        onClick={() => setCurrentScreen("exploration")}
        className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur text-white p-3 rounded-lg hover:bg-white/30 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Simple content to test */}
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">🎣</h1>
        <h2 className="text-4xl font-bold mb-2">Jogo de Pesca</h2>
        <p className="text-xl mb-4">Templo dos Anciões</p>
        <div className="text-8xl mb-4">🐠</div>
        <p className="text-lg text-blue-200">TESTE - Tela funcionando!</p>
      </div>
    </div>
  );
};
