import { useRef, useState, useCallback } from "react";
import { useKeystrokeDynamics, calculatePunctuationPauseStats, calculateRhythmEntropy } from "./useKeystrokeDynamics";
import { useBurstDetection } from "./useBurstDetection";
import { analyzeSession } from "../utils/detectionEngine";
import { SessionData, PasteEvent, FocusEvent } from "../types/session";

export function useTypingTracker() {
  // State for UI
  const [status, setStatus] = useState("Idle");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  // Custom hooks for advanced telemetry
  const keystrokeDynamics = useKeystrokeDynamics();
  const burstDetection = useBurstDetection();

  // Refs for performance-critical data
  const startTime = useRef<number | null>(null);
  const totalChars = useRef(0);
  const backspaceCount = useRef(0);
  const pasteEvents = useRef<PasteEvent[]>([]);
  const focusEvents = useRef<FocusEvent[]>([]);
  const lastBlurTime = useRef<number | null>(null);
  const timeSpentOffPage = useRef(0);
  const isSessionActive = useRef(false);

  // Process keystroke data in idle callback to avoid UI lag
  const processKeystrokeData = useCallback(() => {
    // Allow processing even if session is not active (for paste detection)
    if (!startTime.current) return;

    const now = Date.now();
    
    // Calculate final session data
    const endTime = now;
    const sessionDuration = startTime.current ? endTime - startTime.current : 0;
    
    const punctuationPauses = keystrokeDynamics.getPunctuationPauses();
    const punctuationStats = calculatePunctuationPauseStats(punctuationPauses);
    
    // Get keystroke intervals for rhythm entropy
    const allIntervals = keystrokeDynamics.getKeystrokeIntervals();
    const intervalStdDev = calculateRhythmEntropy(allIntervals);
    
    const burstWindows = burstDetection.getBurstWindows();
    const burstVariance = burstDetection.getBurstVariance();
    const isPotentialBot = burstDetection.isPotentialBot();

    const totalPasteCount = pasteEvents.current.length;
    const totalPastedLength = pasteEvents.current.reduce((sum, e) => sum + e.length, 0);
    const largePasteEvents = pasteEvents.current.filter(e => e.length > 200);

    const blurCount = focusEvents.current.filter(e => e.type === 'blur').length;

    // Build session data object
    const data: SessionData = {
      totalCharacters: totalChars.current,
      totalBackspaces: backspaceCount.current,
      sessionDuration,
      sessionStartTime: startTime.current || 0,
      sessionEndTime: endTime,
      keystrokeIntervals: allIntervals,
      averageInterval: allIntervals.length > 0 ? allIntervals.reduce((a, b) => a + b, 0) / allIntervals.length : 0,
      intervalStdDev,
      burstWindows,
      burstVariance,
      isPotentialBot,
      punctuationPauses: punctuationPauses,
      averagePunctuationPause: punctuationStats.average,
      punctuationPauseStdDev: punctuationStats.stdDev,
      backspaceRatio: totalChars.current > 0 ? backspaceCount.current / totalChars.current : 0,
      correctionRate: totalChars.current > 0 ? (backspaceCount.current / totalChars.current) * 1000 : 0,
      pasteEvents: pasteEvents.current,
      totalPasteCount,
      totalPastedLength,
      largePasteEvents,
      focusEvents: focusEvents.current,
      timeSpentOffPage: timeSpentOffPage.current,
      blurCount,
      humanAuthenticityScore: 0,
      confidenceLevel: 'low',
      riskFlags: [],
    };

    // Run detection engine
    const detectionResult = analyzeSession(data);
    data.humanAuthenticityScore = detectionResult.score;
    data.confidenceLevel = detectionResult.confidenceLevel;
    data.riskFlags = detectionResult.riskFlags;

    setSessionData(data);
  }, [keystrokeDynamics, burstDetection]);

  // Process final data when Finish button is clicked
  const processFinalData = useCallback(() => {
    if (!startTime.current) return;
    
    // End the session
    isSessionActive.current = false;
    setStatus("Session Ended");
    
    // Process all data
    processKeystrokeData();
  }, [processKeystrokeData]);

  // Handle key down - collect data only, no processing
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();

    if (!startTime.current) {
      startTime.current = now;
      isSessionActive.current = true;
    }

    setStatus("Typing...");

    // Track character using burst detection
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      totalChars.current++;
      burstDetection.recordCharacter(now);
      keystrokeDynamics.handleKeystroke(e.key, now);
    }

    // Track backspaces
    if (e.key === "Backspace") {
      backspaceCount.current++;
    }

    // No automatic processing - only process when Finish is clicked
  }, [burstDetection, keystrokeDynamics]);

  // Handle paste with individual event tracking
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    const now = Date.now();
    const timestampRelative = startTime.current ? now - startTime.current : 0;

    pasteEvents.current.push({
      length: pastedText.length,
      timestamp: now,
      timestampRelative,
    });

    totalChars.current += pastedText.length;

    // Update status
    setStatus("Paste detected");

    // No automatic processing - only process when Finish is clicked
  }, []);

  // Handle focus events
  const handleFocus = useCallback(() => {
    if (lastBlurTime.current) {
      const blurDuration = Date.now() - lastBlurTime.current;
      timeSpentOffPage.current += blurDuration;
      lastBlurTime.current = null;
    }

    focusEvents.current.push({
      type: 'focus',
      timestamp: Date.now(),
    });
  }, []);

  const handleBlur = useCallback(() => {
    lastBlurTime.current = Date.now();

    focusEvents.current.push({
      type: 'blur',
      timestamp: Date.now(),
    });
  }, []);

  // Reset session
  const resetSession = useCallback(() => {
    startTime.current = null;
    totalChars.current = 0;
    backspaceCount.current = 0;
    pasteEvents.current = [];
    focusEvents.current = [];
    lastBlurTime.current = null;
    timeSpentOffPage.current = 0;
    isSessionActive.current = false;
    keystrokeDynamics.reset();
    burstDetection.reset();
    setSessionData(null);
    setStatus("Idle");
  }, [keystrokeDynamics, burstDetection]);

  return {
    status,
    handleKeyDown,
    handlePaste,
    handleFocus,
    handleBlur,
    sessionData,
    resetSession,
    processFinalData,
  };
}