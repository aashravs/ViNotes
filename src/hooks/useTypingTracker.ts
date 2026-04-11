import { useRef, useState, useCallback } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";
import { useKeystrokeDynamics, calculatePunctuationPauseStats, calculateRhythmEntropy } from "./useKeystrokeDynamics";
import { useBurstDetection } from "./useBurstDetection";
import { analyzeSession } from "../utils/detectionEngine";
import { SessionData, PasteEvent, FocusEvent } from "../types/session";

function computeKeystrokeStats(intervals: number[]) {
  // We store a compact summary because raw interval arrays are huge and hard to reason about.
  if (!intervals.length) {
    return {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
    };
  }

  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const stdDev = calculateRhythmEntropy(intervals);

  const sorted = [...intervals].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const percentile = (p: number) => {
    if (sorted.length === 1) return sorted[0];

    // Linear interpolation keeps percentiles stable on small samples.
    const position = (sorted.length - 1) * p;
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    const weight = position - lowerIndex;

    const lower = sorted[lowerIndex];
    const upper = sorted[upperIndex];
    return lower + (upper - lower) * weight;
  };

  return {
    mean,
    stdDev,
    min,
    max,
    p25: percentile(0.25),
    p50: percentile(0.5),
    p75: percentile(0.75),
  };
}

function computeIntervalDistribution(intervals: number[]) {
  const buckets: Record<string, number> = {
    "0-100": 0,
    "100-200": 0,
    "200-500": 0,
    "500+": 0,
  };

  for (const value of intervals) {
    if (value < 100) buckets["0-100"]++;
    else if (value < 200) buckets["100-200"]++;
    else if (value < 500) buckets["200-500"]++;
    else buckets["500+"]++;
  }

  return buckets;
}

function calculateBackspaceClusters(timestamps: number[], windowMs: number) {
  // Humans tend to correct in short bursts (delete-delete-delete), not perfectly spaced single backspaces.
  if (timestamps.length < 2) return 0;

  let clusters = 0;
  let runLength = 1;

  for (let i = 1; i < timestamps.length; i++) {
    const diff = timestamps[i] - timestamps[i - 1];
    if (diff <= windowMs) {
      runLength++;
      continue;
    }

    if (runLength >= 2) clusters++;
    runLength = 1;
  }

  if (runLength >= 2) clusters++;
  return clusters;
}

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
  const backspaceTimestamps = useRef<number[]>([]);
  const correctionLatencies = useRef<number[]>([]);
  const lastNormalInputTime = useRef<number | null>(null);
  const hasBackspacedSinceLastNormal = useRef(false);
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
    const keystrokeStats = computeKeystrokeStats(keystrokeIntervals);
    const intervalDistribution = computeIntervalDistribution(keystrokeIntervals);
    const averageInterval = keystrokeStats.mean;
    const intervalStdDev = keystrokeStats.stdDev;

    // Two-line preview keeps logs readable without removing raw data
    const previewIntervals = keystrokeIntervals.slice(0, 50);
    const mid = Math.ceil(previewIntervals.length / 2);
    const keystrokeIntervalsPreview = {
      line1: previewIntervals.length ? previewIntervals.slice(0, mid).join(", ") : "",
      line2: previewIntervals.length ? previewIntervals.slice(mid).join(", ") : "",
    };

    const punctuationPauseEvents = keystrokeDynamics.getPunctuationPauses();
    const punctuationPauseStats = calculatePunctuationPauseStats(punctuationPauseEvents);

    const burstWindows = burstDetection.getBurstWindows();
    const burstVariance = burstDetection.getBurstVariance();
    const { averageBurstLength, burstLengthStdDev } = burstDetection.getBurstLengthStats();
    const { averageBurstPause, burstPauseStdDev } = burstDetection.getBurstPauseStats();
    const isPotentialBot = burstDetection.isPotentialBot();

    const totalPasteCount = pasteEvents.current.length;
    const totalPastedLength = pasteEvents.current.reduce((sum, event) => sum + event.length, 0);
    const largePasteEvents = pasteEvents.current.filter(event => event.length > 200);

    const blurCount = focusEvents.current.filter(event => event.type === "blur").length;
    const backspaceRatio = totalChars.current > 0 ? backspaceCount.current / totalChars.current : 0;
    const correctionRate = totalChars.current > 0 ? (backspaceCount.current / totalChars.current) * 1000 : 0;

    const correctionClusters = calculateBackspaceClusters(backspaceTimestamps.current, 500);
    const averageCorrectionLatency = correctionLatencies.current.length
      ? correctionLatencies.current.reduce((sum, value) => sum + value, 0) / correctionLatencies.current.length
      : 0;

    const analysis = analyzeSession({
      intervalStdDev,
      averagePunctuationPause: punctuationPauseStats.average,
      punctuationPauseStdDev: punctuationPauseStats.stdDev,
      backspaceRatio,
      totalCharacters: totalChars.current,
      correctionClusters,
      averageCorrectionLatency,
      burstVariance,
      burstLengthStdDev,
      burstPauseStdDev,
      isPotentialBot,
      totalPasteCount,
      totalPastedLength,
      largePasteEvents,
      timeSpentOffPage: timeSpentOffPage.current,
      sessionDuration,
      blurCount,
    });

    const data = {
      totalCharacters: totalChars.current,
      totalBackspaces: backspaceCount.current,
      sessionDuration,
      sessionStartTime: startTime.current,
      sessionEndTime: endTime,

      // Raw keystroke intervals are kept internally for analysis,
      // but hidden from output to keep logs clean and readable
      // keystrokeIntervals: keystrokeIntervals.slice(0, 50),
      keystrokeIntervalsPreview,
      keystrokeStats,
      intervalDistribution,
      averageInterval,
      intervalStdDev,

      burstWindows,
      burstVariance,
      averageBurstLength,
      burstLengthStdDev,
      averageBurstPause,
      burstPauseStdDev,
      isPotentialBot,

      punctuationPauses: punctuationPauseEvents,
      averagePunctuationPause: punctuationPauseStats.average,
      punctuationPauseStdDev: punctuationPauseStats.stdDev,

      backspaceRatio,
      correctionRate,
      correctionClusters,
      averageCorrectionLatency,
      correctionScore: analysis.analysis.correctionScore,

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
    } as SessionData;

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

      lastNormalInputTime.current = now;
      hasBackspacedSinceLastNormal.current = false;
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
      backspaceTimestamps.current.push(now);

      // The first backspace after typing is the most meaningful "correction reaction" signal.
      if (lastNormalInputTime.current && !hasBackspacedSinceLastNormal.current) {
        correctionLatencies.current.push(now - lastNormalInputTime.current);
        hasBackspacedSinceLastNormal.current = true;
      }
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

    // Treat paste as a "normal input" boundary for correction latency tracking.
    lastNormalInputTime.current = now;
    hasBackspacedSinceLastNormal.current = false;

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
    backspaceTimestamps.current = [];
    correctionLatencies.current = [];
    lastNormalInputTime.current = null;
    hasBackspacedSinceLastNormal.current = false;
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
