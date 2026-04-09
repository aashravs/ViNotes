import React, { useState } from "react";
import { useTypingTracker } from "./hooks/useTypingTracker";
import Editor from "./components/Editor";
import DevConsole from "./components/DevConsole";

const appStyles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    padding: "40px 20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundImage: `
      linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 24px,
        rgba(0, 0, 0, 0.03) 24px,
        rgba(0, 0, 0, 0.03) 25px
      )
    `,
  },
  content: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "40px",
  },
  title: {
    fontSize: "48px",
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: "8px",
    letterSpacing: "-1px",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
  },
  subtitle: {
    fontSize: "18px",
    color: "#5a6c7d",
    fontWeight: "400",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "4px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
    padding: "40px",
    marginBottom: "24px",
    position: "relative" as const,
    backgroundImage: "repeating-linear-gradient(transparent, transparent 29px, rgba(102, 126, 234, 0.1) 29px, rgba(102, 126, 234, 0.1) 30px)",
  },
  cardBefore: {
    content: '""',
    position: "absolute" as const,
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: "linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8))",
    pointerEvents: "none" as const,
  },
  statusBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  button: {
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    border: "none",
    borderRadius: "4px",
    transition: "all 0.2s ease",
  },
  primaryButton: {
    backgroundColor: "#667eea",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
  },
  secondaryButton: {
    backgroundColor: "#5a6c7d",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(90, 108, 125, 0.3)",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "24px",
  },
};

function App() {
  const tracker = useTypingTracker();
  const [showResults, setShowResults] = useState(false);

  const handleFinish = () => {
    tracker.processFinalData();
    setShowResults(true);
  };

  const handleReset = () => {
    tracker.resetSession();
    setShowResults(false);
  };

  const getStatusStyle = () => {
    switch (tracker.status) {
      case "Typing...":
        return { ...appStyles.statusBadge, backgroundColor: "#d4edda", color: "#155724" };
      case "Thinking...":
        return { ...appStyles.statusBadge, backgroundColor: "#fff3cd", color: "#856404" };
      case "Paste detected":
        return { ...appStyles.statusBadge, backgroundColor: "#f8d7da", color: "#721c24" };
      case "Session Ended":
        return { ...appStyles.statusBadge, backgroundColor: "#d1ecf1", color: "#0c5460" };
      default:
        return { ...appStyles.statusBadge, backgroundColor: "#e2e3e5", color: "#383d41" };
    }
  };

  return (
    <div style={appStyles.container}>
      <div style={appStyles.content}>
        <div style={appStyles.header}>
          <h1 style={appStyles.title}>Vi-Notes</h1>
          <p style={appStyles.subtitle}>Behavioral Biometrics Authorship Verification</p>
        </div>

        {!showResults ? (
          <div style={appStyles.card}>
            <Editor
              handleKeyDown={tracker.handleKeyDown}
              handlePaste={tracker.handlePaste}
              handleFocus={tracker.handleFocus}
              handleBlur={tracker.handleBlur}
            />

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <span style={getStatusStyle()}>{tracker.status}</span>
            </div>

            <div style={appStyles.buttonContainer}>
              <button
                onClick={handleFinish}
                style={{ ...appStyles.button, ...appStyles.primaryButton }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#5568d3";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#667eea";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Finish & Analyze
              </button>
            </div>
          </div>
        ) : (
          <>
            {tracker.sessionData && (
              <div>
                <div style={appStyles.buttonContainer}>
                  <button
                    onClick={handleReset}
                    style={{ ...appStyles.button, ...appStyles.secondaryButton }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#5a6268";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "#6c757d";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    Start New Session
                  </button>
                </div>
                <DevConsole sessionData={tracker.sessionData} onClose={() => {}} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;