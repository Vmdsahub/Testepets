import React from "react";
import WaterEffectWebGL from "./components/WaterEffectWebGL";

const App: React.FC = () => {
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <WaterEffectWebGL />

      {/* Content Container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          background: "rgba(0, 20, 40, 0.7)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "40px",
          textAlign: "center",
          color: "white",
          maxWidth: "500px",
          width: "90%",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "20px",
            fontWeight: "bold",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
          }}
        >
          Water Effect
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            lineHeight: "1.6",
            marginBottom: "30px",
            opacity: 0.9,
          }}
        >
          Advanced WebGL water shader with realistic distortion, caustics, and
          multiple wave layers
        </p>
        <div
          style={{
            display: "flex",
            gap: "15px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              background: "linear-gradient(45deg, #0066cc, #004499)",
              border: "none",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(0, 102, 204, 0.3)",
            }}
          >
            Explore
          </button>
          <button
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "all 0.3s ease",
            }}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
