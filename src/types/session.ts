export interface PunctuationPause {
  punctuationChar: string;
  pauseDuration: number; // ms
  timestamp: number;
}

export interface BurstWindow {
  startTime: number;
  endTime: number;
  characterCount: number;
  wpm: number;
}

export interface PasteEvent {
  length: number;
  timestamp: number;
  timestampRelative: number; // ms from session start
}

export interface FocusEvent {
  type: 'blur' | 'focus';
  timestamp: number;
  duration?: number; // for blur events, how long they were away
}

export interface SessionData {
  // Basic metrics
  totalCharacters: number;
  totalBackspaces: number;
  sessionDuration: number; // ms
  sessionStartTime: number;
  sessionEndTime: number;

  // Timing metrics
  keystrokeIntervals: number[]; // ms between consecutive keystrokes
  averageInterval: number;
  intervalStdDev: number; // rhythm entropy

  // Burst vs constant speed
  burstWindows: BurstWindow[];
  burstVariance: number; // variance between 2-second windows
  isPotentialBot: boolean; // flagged if variance < 10%

  // Punctuation thinking time
  punctuationPauses: PunctuationPause[];
  averagePunctuationPause: number;
  punctuationPauseStdDev: number;

  // Correction patterns
  backspaceRatio: number; // backspaces / total characters
  correctionRate: number; // corrections per 1000 characters

  // Paste detection
  pasteEvents: PasteEvent[];
  totalPasteCount: number;
  totalPastedLength: number;
  largePasteEvents: PasteEvent[]; // > 200 chars

  // Focus monitoring
  focusEvents: FocusEvent[];
  timeSpentOffPage: number; // total ms spent away from window
  blurCount: number;

  // Calculated scores
  humanAuthenticityScore: number; // 0-100
  confidenceLevel: 'low' | 'medium' | 'high';
  riskFlags: string[];
}

export interface DetectionEngineResult {
  score: number; // 0-100
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
