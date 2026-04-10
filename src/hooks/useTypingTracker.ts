import { useRef, useState, useCallback } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";
import { useKeystrokeDynamics, calculatePunctuationPauseStats, calculateRhythmEntropy } from "./useKeystrokeDynamics";
import { useBurstDetection } from "./useBurstDetection";
import { analyzeSession } from "../utils/detectionEngine";
import { SessionData, PasteEvent, FocusEvent } from "../types/session";

export function useTypingTracker() {
  // State for UI
  const [status, setStatus] = useState("Idle");

  // Custom hooks for advanced telemetry
  const keystrokeDynamics = useKeystrokeDynamics();
  const burstDetection = useBurstDetection();

  // Refs for performance-critical data
  const startTime = useRef<number | null>(null);
  const lastKeyTime = useRef<number | null>(null);

  const totalChars = useRef(0);
  const intervals = useRef<number[]>([]);
  const wpmSeries = useRef<number[]>([]);

  const pauseCount = useRef(0);
  const longPauses = useRef<number[]>([]);

  const backspaceCount = useRef(0);
  const pasteEvents = useRef<PasteEvent[]>([]);
  const focusEvents = useRef<FocusEvent[]>([]);
  const lastBlurTime = useRef<number | null>(null);
  const timeSpentOffPage = useRef(0);

  const intervalCharCount = useRef(0);
  const isSessionActive = useRef(false);

  const lastSessionData = useRef<SessionData | null>(null);

  const processKeystrokeData = useCallback((): SessionData | null => {
    if (!startTime.current) return null;

    const endTime = Date.now();
    const sessionDuration = endTime - startTime.current;

    const keystrokeIntervals = keystrokeDynamics.getKeystrokeIntervals();
    const averageInterval = keystrokeIntervals.length
      ? keystrokeIntervals.reduce((sum, value) => sum + value, 0) / keystrokeIntervals.length
      : 0;
    const intervalStdDev = calculateRhythmEntropy(keystrokeIntervals);

    const punctuationPauseEvents = keystrokeDynamics.getPunctuationPauses();
    const punctuationPauseStats = calculatePunctuationPauseStats(punctuationPauseEvents);

    const burstWindows = burstDetection.getBurstWindows();
    const burstVariance = burstDetection.getBurstVariance();
    const isPotentialBot = burstDetection.isPotentialBot();

    const totalPasteCount = pasteEvents.current.length;
    const totalPastedLength = pasteEvents.current.reduce((sum, event) => sum + event.length, 0);
    const largePasteEvents = pasteEvents.current.filter(event => event.length > 200);

    const blurCount = focusEvents.current.filter(event => event.type === "blur").length;
    const backspaceRatio = totalChars.current > 0 ? backspaceCount.current / totalChars.current : 0;
    const correctionRate = totalChars.current > 0 ? (backspaceCount.current / totalChars.current) * 1000 : 0;

    const analysis = analyzeSession({
      intervalStdDev,
      averagePunctuationPause: punctuationPauseStats.average,
      punctuationPauseStdDev: punctuationPauseStats.stdDev,
      backspaceRatio,
      totalCharacters: totalChars.current,
      burstVariance,
      isPotentialBot,
      totalPasteCount,
      totalPastedLength,
      largePasteEvents,
      timeSpentOffPage: timeSpentOffPage.current,
      sessionDuration,
      blurCount,
    });

    const data: SessionData = {
      totalCharacters: totalChars.current,
      totalBackspaces: backspaceCount.current,
      sessionDuration,
      sessionStartTime: startTime.current,
      sessionEndTime: endTime,

      keystrokeIntervals,
      averageInterval,
      intervalStdDev,

      burstWindows,
      burstVariance,
      isPotentialBot,

      punctuationPauses: punctuationPauseEvents,
      averagePunctuationPause: punctuationPauseStats.average,
      punctuationPauseStdDev: punctuationPauseStats.stdDev,

      backspaceRatio,
      correctionRate,

      pasteEvents: pasteEvents.current,
      totalPasteCount,
      totalPastedLength,
      largePasteEvents,

      focusEvents: focusEvents.current,
      timeSpentOffPage: timeSpentOffPage.current,
      blurCount,

      humanAuthenticityScore: analysis.score,
      confidenceLevel: analysis.confidenceLevel,
      riskFlags: analysis.riskFlags,
    };

    lastSessionData.current = data;
    return data;
  }, [burstDetection, keystrokeDynamics]);

  // Process final data when Finish button is clicked
  const processFinalData = useCallback(() => {
    if (!startTime.current) return null;
    
    // End the session
    isSessionActive.current = false;
    setStatus("Session Ended");
    
    // Process all data
    return processKeystrokeData();
  }, [processKeystrokeData]);

  // Handle key down - collect data only, no processing
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const now = Date.now();

    if (!startTime.current) {
      startTime.current = now;
      isSessionActive.current = true;
    }

    setStatus("Typing...");

    // Track character using burst detection
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      totalChars.current++;
      intervalCharCount.current++;
      burstDetection.recordCharacter(now);
      keystrokeDynamics.handleKeystroke(e.key, now);
    }

    // Track intervals
    if (lastKeyTime.current) {
      const diff = now - lastKeyTime.current;
      intervals.current.push(diff);

      // Track pauses
      if (diff > 2000) {
        pauseCount.current++;
        longPauses.current.push(diff);
      }

    }

    lastKeyTime.current = now;

    // Track backspaces
    if (e.key === "Backspace") {
      backspaceCount.current++;
    }

    // No automatic processing - only process when Finish is clicked
  }, [burstDetection, keystrokeDynamics]);

  // Handle paste with individual event tracking
  const handlePaste = useCallback((e: ClipboardEvent) => {
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
    lastKeyTime.current = null;
    totalChars.current = 0;
    intervals.current = [];
    wpmSeries.current = [];
    pauseCount.current = 0;
    longPauses.current = [];
    backspaceCount.current = 0;
    pasteEvents.current = [];
    focusEvents.current = [];
    lastBlurTime.current = null;
    timeSpentOffPage.current = 0;
    intervalCharCount.current = 0;
    isSessionActive.current = false;
    lastSessionData.current = null;
    keystrokeDynamics.reset();
    burstDetection.reset();
    setStatus("Idle");
  }, [keystrokeDynamics, burstDetection]);

  const getSessionMetrics = useCallback(() => {
    if (lastSessionData.current) {
      return {
        totalCharacters: lastSessionData.current.totalCharacters,
        totalBackspaces: lastSessionData.current.totalBackspaces,
        sessionDuration: lastSessionData.current.sessionDuration,
      };
    }

    const sessionDuration = startTime.current ? Date.now() - startTime.current : 0;
    return {
      totalCharacters: totalChars.current,
      totalBackspaces: backspaceCount.current,
      sessionDuration,
    };
  }, []);

  return {
    status,
    handleKeyDown,
    handlePaste,
    handleFocus,
    handleBlur,
    resetSession,
    processFinalData,
    getSessionMetrics,
  };
}
