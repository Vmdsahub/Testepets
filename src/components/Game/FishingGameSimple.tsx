import React from "react";
import { ArrowLeft } from "lucide-react";

interface FishingGameProps {
  onBack: () => void;
  onFishCaught: (fish: any) => void;
}

export const FishingGame: React.FC<FishingGameProps> = ({
  onBack,
  onFishCaught,
}) => {
  console.log("🎣 FishingGame SIMPLE component loaded!");

  return (
    <div className="w-full h-screen bg-blue-900 flex items-center justify-center relative">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur text-white p-3 rounded-lg hover:bg-white/30 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">🎣 Jogo de Pesca</h1>
        <p className="text-xl">Templo dos Anciões</p>
        <div className="mt-8 text-6xl">🐠</div>
        <p className="mt-4 text-gray-300">Teste - Jogo funcionando!</p>
      </div>
    </div>
  );
};
