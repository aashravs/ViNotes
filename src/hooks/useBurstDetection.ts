import { useRef, useCallback } from 'react';
import { BurstWindow } from '../types/session';

interface UseBurstDetectionReturn {
  recordCharacter: (timestamp: number) => void;
  getBurstWindows: () => BurstWindow[];
  getBurstVariance: () => number;
  getBurstLengthStats: () => { averageBurstLength: number; burstLengthStdDev: number };
  getBurstPauseStats: () => { averageBurstPause: number; burstPauseStdDev: number };
  isPotentialBot: () => boolean;
  reset: () => void;
}

const WINDOW_DURATION = 2000; // 2 seconds 

function computeBurstStats(burstWindows: BurstWindow[]) {
  // Burst size variability is a simple proxy for "stop to think, then type" behavior.
  if (!burstWindows.length) {
    return { averageBurstLength: 0, burstLengthStdDev: 0 };
  }

  const lengths = burstWindows.map(w => w.characterCount);
  const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
  const variance = lengths.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return { averageBurstLength: mean, burstLengthStdDev: stdDev };
}

function computeBurstPauseStats(burstWindows: BurstWindow[]) {
  // Window timestamps are continuous (2s buckets), so startTime/endTime gaps are almost always 0.
  // Keystroke timestamps capture real pauses: last key in burst A -> first key in burst B.
  if (burstWindows.length < 2) {
    return { averageBurstPause: 0, burstPauseStdDev: 0 };
  }

  const pauses: number[] = [];
  for (let i = 1; i < burstWindows.length; i++) {
    const pause = burstWindows[i].firstKeystrokeTime - burstWindows[i - 1].lastKeystrokeTime;
    if (pause > 0) pauses.push(pause);
  }

  if (!pauses.length) {
    return { averageBurstPause: 0, burstPauseStdDev: 0 };
  }

  const mean = pauses.reduce((sum, value) => sum + value, 0) / pauses.length;
  const variance = pauses.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / pauses.length;
  const stdDev = Math.sqrt(variance);

  return { averageBurstPause: mean, burstPauseStdDev: stdDev };
}

export function useBurstDetection(): UseBurstDetectionReturn {
  const burstWindows = useRef<BurstWindow[]>([]);
  const currentWindow = useRef<{
    startTime: number;
    characterCount: number;
    firstKeystrokeTime: number;
    lastKeystrokeTime: number;
  } | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  // Process completed window
  const processWindow = useCallback((
    startTime: number,
    endTime: number,
    characterCount: number,
    firstKeystrokeTime: number,
    lastKeystrokeTime: number
  ) => {
    const durationMinutes = (endTime - startTime) / 60000;
    const wpm = durationMinutes > 0 ? (characterCount / 5) / durationMinutes : 0;
    
    burstWindows.current.push({
      startTime,
      endTime,
      firstKeystrokeTime,
      lastKeystrokeTime,
      characterCount,
      wpm,
    });
  }, []);

  // Check if current window needs to be closed
  const checkWindowBoundary = useCallback((timestamp: number) => {
    if (!currentWindow.current) return;

    const windowElapsed = timestamp - currentWindow.current.startTime;
    
    if (windowElapsed >= WINDOW_DURATION) {
      // Close current window
      processWindow(
        currentWindow.current.startTime,
        timestamp,
        currentWindow.current.characterCount,
        currentWindow.current.firstKeystrokeTime,
        currentWindow.current.lastKeystrokeTime
      );
      
      // Start new window
      currentWindow.current = {
        startTime: timestamp,
        characterCount: 0,
        firstKeystrokeTime: timestamp,
        lastKeystrokeTime: timestamp,
      };
    }
  }, [processWindow]);

  const recordCharacter = useCallback((timestamp: number) => {
    if (!sessionStartTime.current) {
      sessionStartTime.current = timestamp;
    }

    if (!currentWindow.current) {
      currentWindow.current = {
        startTime: timestamp,
        characterCount: 0,
        firstKeystrokeTime: timestamp,
        lastKeystrokeTime: timestamp,
      };
    }

    // Check if we need to close the current window
    checkWindowBoundary(timestamp);

    // Record character in current window
    if (currentWindow.current) {
      currentWindow.current.characterCount++;
      currentWindow.current.lastKeystrokeTime = timestamp;
    }
  }, [checkWindowBoundary]);

  const getBurstWindows = useCallback(() => {
    // Return copy of windows plus current window if it exists
    const windows = [...burstWindows.current];
    
    if (currentWindow.current && currentWindow.current.characterCount > 0) {
      const now = Date.now();
      const durationMinutes = (now - currentWindow.current.startTime) / 60000;
      const wpm = durationMinutes > 0 ? (currentWindow.current.characterCount / 5) / durationMinutes : 0;
      
      windows.push({
        startTime: currentWindow.current.startTime,
        endTime: now,
        firstKeystrokeTime: currentWindow.current.firstKeystrokeTime,
        lastKeystrokeTime: currentWindow.current.lastKeystrokeTime,
        characterCount: currentWindow.current.characterCount,
        wpm,
      });
    }
    
    return windows;
  }, []);

  const getBurstVariance = useCallback(() => {
    const windows = getBurstWindows();
    
    if (windows.length < 2) {
      return 0;
    }

    const wpms = windows.map(w => w.wpm);
    const average = wpms.reduce((sum, wpm) => sum + wpm, 0) / wpms.length;
    
    // Calculate coefficient of variation (CV) = (stdDev / mean) * 100
    const variance = wpms.reduce((sum, wpm) => sum + Math.pow(wpm - average, 2), 0) / wpms.length;
    const stdDev = Math.sqrt(variance);
    
    // Return as percentage
    return average > 0 ? (stdDev / average) * 100 : 0;
  }, [getBurstWindows]);

  const getBurstLengthStats = useCallback(() => {
    const windows = getBurstWindows();
    return computeBurstStats(windows);
  }, [getBurstWindows]);

  const getBurstPauseStats = useCallback(() => {
    const windows = getBurstWindows();
    return computeBurstPauseStats(windows);
  }, [getBurstWindows]);

  const isPotentialBot = useCallback(() => {
    const variance = getBurstVariance();
    // If variance between windows is < 10%, flag as potential bot
    return variance < 10 && variance > 0;
  }, [getBurstVariance]);

  const reset = useCallback(() => {
    burstWindows.current = [];
    currentWindow.current = null;
    sessionStartTime.current = null;
  }, []);

  return {
    recordCharacter,
    getBurstWindows,
    getBurstVariance,
    getBurstLengthStats,
    getBurstPauseStats,
    isPotentialBot,
    reset,
  };
}
