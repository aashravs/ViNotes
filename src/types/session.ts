export interface PunctuationPause {
  punctuationChar: string;
  pauseDuration: number; 
  timestamp: number;
}

export interface BurstWindow {
  startTime: number;
  endTime: number;
  firstKeystrokeTime: number;
  lastKeystrokeTime: number;
  characterCount: number;
  wpm: number;
}

export interface PasteEvent {
  length: number;
  timestamp: number;
  timestampRelative: number; 
}

export interface FocusEvent {
  type: 'blur' | 'focus';
  timestamp: number;
  duration?: number;
}

export interface SessionData {
  totalCharacters: number;
  totalBackspaces: number;
  sessionDuration: number;
  sessionStartTime: number;
  sessionEndTime: number;

  keystrokeIntervals: number[]; 
  keystrokeIntervalsPreview?: {
    line1: string;
    line2: string;
  };
  keystrokeStats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    p25: number;
    p50: number; 
    p75: number;
  };
  intervalDistribution?: Record<string, number>;
  averageInterval: number;
  intervalStdDev: number; 

  burstWindows: BurstWindow[];
  burstVariance: number; 
  averageBurstLength: number;
  burstLengthStdDev: number;
  averageBurstPause: number;
  burstPauseStdDev: number;
  isPotentialBot: boolean; 

  punctuationPauses: PunctuationPause[];
  averagePunctuationPause: number;
  punctuationPauseStdDev: number;

  backspaceRatio: number; // backspaces / total characters
  correctionRate: number; // corrections per 1000 characters
  correctionClusters: number; // sequences of backspaces close in time
  averageCorrectionLatency: number; // ms between a normal input and first backspace
  correctionScore: number; 

  pasteEvents: PasteEvent[];
  totalPasteCount: number;
  totalPastedLength: number;
  largePasteEvents: PasteEvent[];

  focusEvents: FocusEvent[];
  timeSpentOffPage: number; 
  blurCount: number;

  humanAuthenticityScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  riskFlags: string[];
}

export interface DetectionEngineResult {
  score: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  riskFlags: string[];
  analysis: {
    rhythmScore: number;
    punctuationScore: number;
    correctionScore: number;
    burstScore: number;
    pasteScore: number;
    focusScore: number;
  };
}
