import { useRef, useCallback } from 'react';
import { PunctuationPause } from '../types/session';

interface UseKeystrokeDynamicsReturn {
  handleKeystroke: (key: string, timestamp: number) => void;
  getPunctuationPauses: () => PunctuationPause[];
  getKeystrokeIntervals: () => number[];
  reset: () => void;
}

export function useKeystrokeDynamics(): UseKeystrokeDynamicsReturn {
  const lastKeyTime = useRef<number | null>(null);
  const lastChar = useRef<string | null>(null);
  const punctuationPauses = useRef<PunctuationPause[]>([]);
  const keystrokeIntervals = useRef<number[]>([]);

  const handleKeystroke = useCallback((key: string, timestamp: number) => {
    if (lastKeyTime.current) {
      const interval = timestamp - lastKeyTime.current;
      keystrokeIntervals.current.push(interval);

      if (lastChar.current && /[.,!?;:]/.test(lastChar.current)) {
        if (/[a-zA-Z0-9]/.test(key)) {
          punctuationPauses.current.push({
            punctuationChar: lastChar.current,
            pauseDuration: interval,
            timestamp: timestamp,
          });
        }
      }
    }

    lastKeyTime.current = timestamp;
    lastChar.current = key;
  }, []);

  const getPunctuationPauses = useCallback(() => {
    return punctuationPauses.current;
  }, []);

  const getKeystrokeIntervals = useCallback(() => {
    return keystrokeIntervals.current;
  }, []);

  const reset = useCallback(() => {
    lastKeyTime.current = null;
    lastChar.current = null;
    punctuationPauses.current = [];
    keystrokeIntervals.current = [];
  }, []);

  return {
    handleKeystroke,
    getPunctuationPauses,
    getKeystrokeIntervals,
    reset,
  };
}

export function calculatePunctuationPauseStats(pauses: PunctuationPause[]) {
  if (pauses.length === 0) {
    return {
      average: 0,
      stdDev: 0,
      count: 0,
    };
  }

  const durations = pauses.map(p => p.pauseDuration);
  const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);

  return {
    average,
    stdDev,
    count: pauses.length,
  };
}

export function calculateRhythmEntropy(intervals: number[]) {
  if (intervals.length === 0) {
    return 0;
  }

  const average = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  const variance = intervals.reduce((sum, i) => sum + Math.pow(i - average, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  return stdDev;
}
