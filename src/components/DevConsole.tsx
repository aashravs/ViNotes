import React from 'react';
import { SessionData } from '../types/session';

interface DevConsoleProps {
  sessionData: SessionData;
  onClose: () => void;
}

const consoleStyles = {
  container: {
    maxWidth: "800px",
    margin: "30px auto",
    backgroundColor: "#1e1e1e",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    overflow: "hidden",
  },
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "16px 20px",
    backgroundColor: "#2d2d2d",
    borderBottom: "1px solid #404040",
  },
  title: {
    color: "#ffffff",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    margin: 0,
  },
  closeButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#888888",
    cursor: "pointer",
    fontSize: "20px",
    padding: "4px 8px",
    fontFamily: "monospace",
  },
  content: {
    padding: "20px",
    maxHeight: "500px",
    overflowY: "auto" as const,
  },
  scoreSection: {
    marginBottom: "24px",
    padding: "20px",
    backgroundColor: "#2d2d2d",
    borderRadius: "6px",
    borderLeft: "4px solid #4caf50",
  },
  scoreValue: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#4caf50",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    marginBottom: "8px",
  },
  confidenceBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitle: {
    color: "#888888",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "12px",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  metricCard: {
    backgroundColor: "#2d2d2d",
    padding: "12px 16px",
    borderRadius: "4px",
  },
  metricLabel: {
    color: "#888888",
    fontSize: "11px",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    marginBottom: "4px",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
  riskFlags: {
    backgroundColor: "#3d2d2d",
    border: "1px solid #5c3d3d",
    borderRadius: "4px",
    padding: "12px 16px",
  },
  riskFlagItem: {
    color: "#ff6b6b",
    fontSize: "13px",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    marginBottom: "8px",
    display: "flex" as const,
    alignItems: "center" as const,
  },
  riskFlagItemLast: {
    color: "#ff6b6b",
    fontSize: "13px",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    marginBottom: 0,
    display: "flex" as const,
    alignItems: "center" as const,
  },
  bullet: {
    marginRight: "8px",
    color: "#ff6b6b",
  },
};

function getConfidenceColor(level: string): string {
  switch (level) {
    case 'high':
      return '#4caf50';
    case 'medium':
      return '#ff9800';
    case 'low':
      return '#f44336';
    default:
      return '#888888';
  }
}

function getConfidenceBg(level: string): string {
  switch (level) {
    case 'high':
      return 'rgba(76, 175, 80, 0.2)';
    case 'medium':
      return 'rgba(255, 152, 0, 0.2)';
    case 'low':
      return 'rgba(244, 67, 54, 0.2)';
    default:
      return 'rgba(136, 136, 136, 0.2)';
  }
}

export default function DevConsole({ sessionData, onClose }: DevConsoleProps) {
  const confidenceColor = getConfidenceColor(sessionData.confidenceLevel);
  const confidenceBg = getConfidenceBg(sessionData.confidenceLevel);

  return (
    <div style={consoleStyles.container}>
      <div style={consoleStyles.header}>
        <h2 style={consoleStyles.title}>Analysis Report</h2>
        <button style={consoleStyles.closeButton} onClick={onClose}>×</button>
      </div>
      
      <div style={consoleStyles.content}>
        {/* Human Authenticity Score */}
        <div style={consoleStyles.scoreSection}>
          <div style={consoleStyles.scoreValue}>
            {sessionData.humanAuthenticityScore}%
          </div>
          <span
            style={{
              ...consoleStyles.confidenceBadge,
              backgroundColor: confidenceBg,
              color: confidenceColor,
            }}
          >
            {sessionData.confidenceLevel} Confidence
          </span>
          <p style={{ color: "#888888", fontSize: "13px", marginTop: "12px", margin: "12px 0 0 0", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
            Human Authenticity Score based on behavioral biometrics analysis
          </p>
        </div>

        {/* Risk Flags */}
        {sessionData.riskFlags && sessionData.riskFlags.length > 0 && (
          <div style={consoleStyles.section}>
            <h3 style={consoleStyles.sectionTitle}>Risk Flags</h3>
            <div style={consoleStyles.riskFlags}>
              {sessionData.riskFlags.map((flag, index) => (
                <div
                  key={index}
                  style={index === sessionData.riskFlags!.length - 1 ? consoleStyles.riskFlagItemLast : consoleStyles.riskFlagItem}
                >
                  <span style={consoleStyles.bullet}>⚠</span>
                  {flag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Metrics */}
        <div style={consoleStyles.section}>
          <h3 style={consoleStyles.sectionTitle}>Session Metrics</h3>
          <div style={consoleStyles.metricGrid}>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Total Characters</div>
              <div style={consoleStyles.metricValue}>{sessionData.totalCharacters}</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Session Duration</div>
              <div style={consoleStyles.metricValue}>{(sessionData.sessionDuration / 1000).toFixed(1)}s</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Backspaces</div>
              <div style={consoleStyles.metricValue}>{sessionData.totalBackspaces}</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Backspace Ratio</div>
              <div style={consoleStyles.metricValue}>{(sessionData.backspaceRatio * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Timing Analysis */}
        <div style={consoleStyles.section}>
          <h3 style={consoleStyles.sectionTitle}>Timing Analysis</h3>
          <div style={consoleStyles.metricGrid}>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Avg Keystroke Interval</div>
              <div style={consoleStyles.metricValue}>{sessionData.averageInterval.toFixed(0)}ms</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Interval Std Dev</div>
              <div style={consoleStyles.metricValue}>{sessionData.intervalStdDev.toFixed(0)}ms</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Avg Punctuation Pause</div>
              <div style={consoleStyles.metricValue}>{sessionData.averagePunctuationPause.toFixed(0)}ms</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Burst Variance</div>
              <div style={consoleStyles.metricValue}>{sessionData.burstVariance.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Paste & Focus */}
        <div style={consoleStyles.section}>
          <h3 style={consoleStyles.sectionTitle}>Paste & Focus Events</h3>
          <div style={consoleStyles.metricGrid}>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Paste Events</div>
              <div style={consoleStyles.metricValue}>{sessionData.totalPasteCount}</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Total Pasted</div>
              <div style={consoleStyles.metricValue}>{sessionData.totalPastedLength} chars</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Large Pastes</div>
              <div style={consoleStyles.metricValue}>{sessionData.largePasteEvents.length}</div>
            </div>
            <div style={consoleStyles.metricCard}>
              <div style={consoleStyles.metricLabel}>Time Off Page</div>
              <div style={consoleStyles.metricValue}>{(sessionData.timeSpentOffPage / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* Raw Data Toggle */}
        <div style={consoleStyles.section}>
          <h3 style={consoleStyles.sectionTitle}>Raw Session Data</h3>
          <pre style={{
            backgroundColor: "#2d2d2d",
            padding: "16px",
            borderRadius: "4px",
            overflow: "auto",
            fontSize: "11px",
            color: "#a0a0a0",
            fontFamily: "'Consolas', 'Monaco', monospace",
            maxHeight: "200px",
          }}>
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
