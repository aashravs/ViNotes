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

const WINDOW_DURATION = 2000; 

function computeBurstStats(burstWindows: BurstWindow[]) {
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

  const checkWindowBoundary = useCallback((timestamp: number) => {
    if (!currentWindow.current) return;

    const windowElapsed = timestamp - currentWindow.current.startTime;
    
    if (windowElapsed >= WINDOW_DURATION) {
      processWindow(
        currentWindow.current.startTime,
        timestamp,
        currentWindow.current.characterCount,
        currentWindow.current.firstKeystrokeTime,
        currentWindow.current.lastKeystrokeTime
      );
      
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

    checkWindowBoundary(timestamp);

    if (currentWindow.current) {
      currentWindow.current.characterCount++;
      currentWindow.current.lastKeystrokeTime = timestamp;
    }
  }, [checkWindowBoundary]);

  const getBurstWindows = useCallback(() => {
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
    
    const variance = wpms.reduce((sum, wpm) => sum + Math.pow(wpm - average, 2), 0) / wpms.length;
    const stdDev = Math.sqrt(variance);
    
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
