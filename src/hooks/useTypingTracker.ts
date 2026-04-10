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
  const lastKeyTime = useRef<number | null>(null);

  const totalChars = useRef(0);
  const intervals = useRef<number[]>([]);
  const wpmSeries = useRef<number[]>([]);

  const pauseCount = useRef(0);
  const longPauses = useRef<number[]>([]);
  const punctuationPauses = useRef<number[]>([]);

  const backspaceCount = useRef(0);
  const pasteEvents = useRef<PasteEvent[]>([]);
  const focusEvents = useRef<FocusEvent[]>([]);
  const lastBlurTime = useRef<number | null>(null);
  const timeSpentOffPage = useRef(0);

  const lastChar = useRef<string | null>(null);

  const intervalCharCount = useRef(0);
  const isSessionActive = useRef(false);

  // Process final data when Finish button is clicked
  const processFinalData = useCallback(() => {
    if (!startTime.current) return;
    
    // End the session
    isSessionActive.current = false;
    setStatus("Session Ended");
    
    // Process all data
    processKeystrokeData();
  }, [processKeystrokeData]);

  // Process keystroke data and run detection engine
  const processKeystrokeData = useCallback(() => {
    if (!startTime.current) return;

    const endTime = Date.now();
    const sessionDuration = endTime - startTime.current;

    // Calculate WPM
    const minutes = sessionDuration / 60000;
    const avgWPM = minutes > 0 ? (totalChars.current / 5) / minutes : 0;

    // Get data from custom hooks
    const keystrokeIntervals = keystrokeDynamics.getKeystrokeIntervals();
    const punctuationPauseStats = calculatePunctuationPauseStats(punctuationPauses.current);
    const rhythmEntropy = calculateRhythmEntropy(keystrokeIntervals);
    const burstData = burstDetection.getBurstData();

    // Build session data object
    const data: SessionData = {
      startTime: startTime.current,
      endTime,
      sessionDuration,
      totalCharacters: totalChars.current,
      totalPastedLength: pasteEvents.current.reduce((sum, event) => sum + event.length, 0),
      pasteEvents: pasteEvents.current,
      avgWPM,
      intervals: intervals.current,
      wpmSeries: wpmSeries.current,
      pauseCount: pauseCount.current,
      longPauses: longPauses.current,
      punctuationPauses: punctuationPauses.current,
      backspaceCount: backspaceCount.current,
      keystrokeIntervals,
      punctuationPauseStats,
      rhythmEntropy,
      burstWindows: burstData.burstWindows,
      burstVariance: burstData.variance,
      isPotentialBot: burstData.isPotentialBot,
      focusEvents: focusEvents.current,
      blurCount: focusEvents.current.filter(e => e.type === 'blur').length,
      timeSpentOffPage: timeSpentOffPage.current,
    };

    // Run detection engine
    const analysis = analyzeSession(data);
    setSessionData(analysis);
  }, [keystrokeDynamics, burstDetection]);

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

      // Track punctuation pauses
      if (lastChar.current && /[.,!?]/.test(lastChar.current)) {
        if (diff > 500) {
          punctuationPauses.current.push(diff);
        }
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
    lastKeyTime.current = null;
    totalChars.current = 0;
    intervals.current = [];
    wpmSeries.current = [];
    pauseCount.current = 0;
    longPauses.current = [];
    punctuationPauses.current = [];
    backspaceCount.current = 0;
    pasteEvents.current = [];
    focusEvents.current = [];
    lastBlurTime.current = null;
    timeSpentOffPage.current = 0;
    lastChar.current = null;
    intervalCharCount.current = 0;
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