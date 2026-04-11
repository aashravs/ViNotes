import React, { useState } from "react";
import { useTypingTracker } from "./hooks/useTypingTracker";
import Editor from "./components/Editor";

const appStyles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    background: "#c07a54",
    padding: "64px 20px",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  content: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "52px",
    background: "transparent",
    borderRadius: "0",
    padding: "0",
  },
  title: {
    fontSize: "48px",
    fontWeight: "700",
    color: "#2b211c",
    marginBottom: "8px",
    letterSpacing: "-0.8px",
    textShadow: "none",
  },
  subtitle: {
    fontSize: "18px",
    color: "#5e4b43",
    fontWeight: "400",
  },
  card: {
    backgroundColor: "#fffdfb",
    borderRadius: "12px",
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.15)",
    padding: "44px",
    marginBottom: "36px",
    position: "relative" as const,
  },
  statusBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: "14px",
    border: "1px solid #e6dcd6",
    fontSize: "14px",
    fontWeight: "500",
    textTransform: "none" as const,
    letterSpacing: "0.2px",
  },
  button: {
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid transparent",
    borderRadius: "10px",
    transition: "background-color 0.15s ease",
  },
  primaryButton: {
    backgroundColor: "#b06040",
    color: "#ffffff",
    boxShadow: "0 6px 12px rgba(0,0,0,0.12)",
  },
  secondaryButton: {
    backgroundColor: "#fffdfb",
    color: "#2b211c",
    border: "1px solid rgba(43, 33, 28, 0.24)",
    boxShadow: "none",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "24px",
  },
};

function App() {

  const [results, setResults] = useState<{ wpm: number; errorRate: number } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tracker = useTypingTracker(email);//added email tracker

  const appendSessionToStorage = (sessionData: unknown, userName: string, userEmail: string) => {
    const timestamp = Date.now();
    const sessionEntry = {
      name: userName,
      email: userEmail,
      sessionData,
      timestamp,
    };

    try {
      const existing = localStorage.getItem("vi-notes-sessions");
      const parsed = existing ? JSON.parse(existing) : [];
      const sessions = Array.isArray(parsed) ? parsed : [];
      sessions.push(sessionEntry);
      localStorage.setItem("vi-notes-sessions", JSON.stringify(sessions));
    } catch {
      localStorage.setItem("vi-notes-sessions", JSON.stringify([sessionEntry]));
    }
  };

  const validateAndStartSession = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setFormError("Name and email are required");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setFormError("Please enter a valid email");
      return;
    }

    setFormError(null);
    setName(trimmedName);
    setEmail(trimmedEmail);
    setSessionStarted(true);
  };

  const handleFinish = () => {
    const finalSession = tracker.processFinalData();
    if (!finalSession) return;

    fetch("http://localhost:5000/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        data: finalSession,
      }),
    });

    const minutes = finalSession.sessionDuration / 60000;
    const wpm = minutes > 0 ? (finalSession.totalCharacters / 5) / minutes : 0;
    const errorRate = finalSession.totalCharacters > 0 ? finalSession.totalBackspaces / finalSession.totalCharacters : 0;

    appendSessionToStorage(finalSession, name, email);
    setResults({ wpm, errorRate });
  };

  const handleReset = () => {
    tracker.resetSession();
    setResults(null);
    setSessionStarted(true);
  };

  const getStatusStyle = () => {
    switch (tracker.status) {
      case "Typing...":
        return { ...appStyles.statusBadge, backgroundColor: "rgba(176, 96, 64, 0.12)", color: "#b06040" };
      case "Thinking...":
        return { ...appStyles.statusBadge, backgroundColor: "rgba(110, 98, 92, 0.10)", color: "#5e4b43" };
      case "Paste detected":
        return { ...appStyles.statusBadge, backgroundColor: "rgba(176, 96, 64, 0.16)", color: "#2b211c" };
      case "Session Ended":
        return { ...appStyles.statusBadge, backgroundColor: "rgba(46, 42, 40, 0.06)", color: "#5e4b43" };
      default:
        return { ...appStyles.statusBadge, backgroundColor: "rgba(46, 42, 40, 0.04)", color: "#5e4b43" };
    }
  };

  return (
    <div style={appStyles.container}>
      <div style={appStyles.content}>
        <div style={appStyles.header}>
          <h1 style={appStyles.title}>Vi-Notes</h1>
          <p style={appStyles.subtitle}>Behavioral Biometrics Authorship Verification</p>
        </div>

        {!sessionStarted ? (
          <div style={appStyles.card}>
            <div style={{ maxWidth: "520px", margin: "0 auto" }}>
              <div style={{ fontSize: "18px", fontWeight: 600, color: "#2b211c", textAlign: "center" }}>
                Identify Yourself
              </div>

              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#5e4b43", marginBottom: "6px" }}>
                  Name
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "16px",
                    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
                    borderRadius: "10px",
                    border: "1px solid #e6dcd6",
                    backgroundColor: "#fffdfb",
                    color: "#2b211c",
                    boxShadow: "inset 0 1px 0 rgba(46, 42, 40, 0.04)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="Your name"
                />
              </div>

              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#5e4b43", marginBottom: "6px" }}>
                  Email
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "16px",
                    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
                    borderRadius: "10px",
                    border: "1px solid #e6dcd6",
                    backgroundColor: "#fffdfb",
                    color: "#2b211c",
                    boxShadow: "inset 0 1px 0 rgba(46, 42, 40, 0.04)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="name@example.com"
                />
              </div>

              {formError && (
                <div style={{ marginTop: "14px", textAlign: "center", color: "#b06040", fontWeight: 500, fontSize: "13px" }}>
                  {formError}
                </div>
              )}

              <div style={appStyles.buttonContainer}>
                <button
                  onClick={validateAndStartSession}
                  style={{ ...appStyles.button, ...appStyles.primaryButton }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#944e33";
                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.12)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#b06040";
                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.12)";
                  }}
                >
                  Start Session
                </button>
              </div>
            </div>
          </div>
        ) : !results ? (
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
                  e.currentTarget.style.backgroundColor = "#944e33";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.12)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#b06040";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.12)";
                }}
              >
                Finish & Analyze
              </button>
            </div>
          </div>
        ) : (
          <div style={appStyles.card}>
            <div
              style={{
                textAlign: "center",
                background: "rgba(176,96,64,0.06)",
                border: "1px solid rgba(176,96,64,0.15)",
                borderRadius: "12px",
                padding: "30px",
                boxShadow: "none",
              }}
            >
              <div style={{ fontSize: "30px", fontWeight: 700, color: "#2b211c" }}>
                WPM: {results.wpm.toFixed(1)}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: "#5e4b43", marginTop: "14px" }}>
                Error Rate: {results.errorRate.toFixed(3)}
              </div>
            </div>

            <div style={appStyles.buttonContainer}>
              <button
                onClick={handleReset}
                style={{ ...appStyles.button, ...appStyles.secondaryButton }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f2ece8";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#fffdfb";
                }}
              >
                Start New Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;