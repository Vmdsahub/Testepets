// Utilitário de teste para validar se o sistema de área de água está funcionando

interface WaterArea {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "rectangle" | "circle" | "triangle";
}

// Função para testar se um ponto está dentro da área de água
export function testWaterAreaValidation(
  pixelX: number,
  pixelY: number,
  waterArea: WaterArea,
): boolean {
  // Converter pixels para coordenadas relativas (0-1)
  const relX = pixelX / window.innerWidth;
  const relY = pixelY / window.innerHeight;

  const { x, y, width, height, shape } = waterArea;

  switch (shape) {
    case "rectangle":
      return relX >= x && relX <= x + width && relY >= y && relY <= y + height;

    case "circle": {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(width, height) / 2;
      const distance = Math.sqrt((relX - centerX) ** 2 + (relY - centerY) ** 2);
      return distance <= radius;
    }

    case "triangle": {
      // Triângulo: topo centro, base esquerda, base direita
      const tx1 = x + width / 2; // Topo centro
      const ty1 = y;
      const tx2 = x; // Base esquerda
      const ty2 = y + height;
      const tx3 = x + width; // Base direita
      const ty3 = y + height;

      // Algoritmo de área para verificar se ponto está dentro do triângulo
      const area = Math.abs(
        (tx2 - tx1) * (ty3 - ty1) - (tx3 - tx1) * (ty2 - ty1),
      );
      const area1 = Math.abs(
        (relX - tx2) * (ty3 - ty2) - (tx3 - tx2) * (relY - ty2),
      );
      const area2 = Math.abs(
        (tx1 - relX) * (relY - ty1) - (relX - tx1) * (ty1 - relY),
      );
      const area3 = Math.abs(
        (tx2 - tx1) * (relY - ty1) - (relX - tx1) * (ty2 - ty1),
      );

      return Math.abs(area - (area1 + area2 + area3)) < 0.001;
    }

    default:
      return false;
  }
}

// Função para testar múltiplos pontos
export function runWaterAreaTests(): void {
  console.log("🧪 Iniciando testes de validação da área de água...");

  // Área de teste retangular
  const testArea: WaterArea = {
    x: 0.2, // 20% da tela
    y: 0.3, // 30% da tela
    width: 0.6, // 60% da largura
    height: 0.4, // 40% da altura
    shape: "rectangle",
  };

  const testCases = [
    {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      expected: true,
      description: "Centro da área",
    },
    {
      x: window.innerWidth * 0.1,
      y: window.innerHeight * 0.1,
      expected: false,
      description: "Fora da área (canto superior esquerdo)",
    },
    {
      x: window.innerWidth * 0.9,
      y: window.innerHeight * 0.9,
      expected: false,
      description: "Fora da área (canto inferior direito)",
    },
    {
      x: window.innerWidth * 0.2,
      y: window.innerHeight * 0.3,
      expected: true,
      description: "Borda da área",
    },
  ];

  testCases.forEach((testCase, index) => {
    const result = testWaterAreaValidation(testCase.x, testCase.y, testArea);
    const status = result === testCase.expected ? "✅ PASS" : "❌ FAIL";
    console.log(`Teste ${index + 1}: ${status} - ${testCase.description}`);
  });

  console.log("🧪 Testes concluídos!");
}
