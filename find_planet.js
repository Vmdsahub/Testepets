// Script to find which planet has "Planície Dourada"
const planetIds = [
  "planet-0",
  "planet-1",
  "planet-2",
  "planet-3",
  "planet-4",
  "planet-5",
];

const pointTemplates = [
  // Set 0 - Water features
  [
    "Lagos Cristalinos",
    "Cascatas Etéreas",
    "Gêiseres de Vapor",
    "Rios Subterrâneos",
    "Oceano de Metano",
  ],
  // Set 1 - Mountain features
  [
    "Cadeias Montanhosas",
    "Vulcões Inativos",
    "Crateras Profundas",
    "Desfiladeiros Rochosos",
    "Picos Gelados",
  ],
  // Set 2 - Desert features
  [
    "Dunas Infinitas",
    "Oásis Perdido",
    "Tempestades de Areia",
    "Cânions Secos",
    "Miragens Permanentes",
  ],
  // Set 3 - Crystal features
  [
    "Cavernas de Cristal",
    "Formações Minerais",
    "Geodos Gigantes",
    "Veios de Quartzo",
    "Jardins de Pedra",
  ],
  // Set 4 - Underground features
  [
    "Túneis Profundos",
    "Câmaras Subterrâneas",
    "Galerias Minerais",
    "Labirinto Subterrâneo",
  ],
  // Set 5 - Atmospheric features (AQUI ESTÁ A PLANÍCIE DOURADA!)
  [
    "Vale dos Ventos",
    "Planalto Nebuloso",
    "Picos Nevados",
    "Desfiladeiro Sombrio",
    "Planície Dourada", // <- Este é o index 4 no set 5
  ],
];

function findPlanetWithGoldenPlains() {
  for (const planetId of planetIds) {
    // Replica the hash function from gameStore.ts
    let hash = 0;
    for (let i = 0; i < planetId.length; i++) {
      hash = ((hash << 5) - hash + planetId.charCodeAt(i)) & 0xffffffff;
    }
    const setIndex = Math.abs(hash) % pointTemplates.length;

    console.log(`Planet ${planetId}: hash=${hash}, setIndex=${setIndex}`);

    if (setIndex === 5) {
      // Set 5 contains "Planície Dourada"
      console.log(`🎯 FOUND! Planet ${planetId} has "Planície Dourada"`);
      console.log(`Set: ${JSON.stringify(pointTemplates[setIndex])}`);

      // Find the position of "Planície Dourada" (should be index 4)
      const goldenPlainsIndex =
        pointTemplates[setIndex].indexOf("Planície Dourada");
      console.log(
        `"Planície Dourada" is at index ${goldenPlainsIndex} in the set`,
      );

      // Calculate the exploration point ID
      const pointId = `${planetId}_point_${goldenPlainsIndex + 1}`;
      console.log(`Exploration point ID: ${pointId}`);

      return { planetId, pointId, setIndex, goldenPlainsIndex };
    }
  }
  return null;
}

const result = findPlanetWithGoldenPlains();
console.log("\nResult:", result);
