import { SessionData, DetectionEngineResult } from '../types/session';

export function analyzeSession(sessionData: Partial<SessionData>): DetectionEngineResult {
  const riskFlags: string[] = [];
  
  // 1. Rhythm Score (0-100)
  // High entropy (varied timing) suggests human thought
  // Low entropy suggests virtual keyboard or bot
  const rhythmScore = calculateRhythmScore(sessionData.intervalStdDev || 0);
  if (rhythmScore < 30) {
    riskFlags.push('LOW_RHYTHM_ENTROPY: Consistent timing patterns detected');
  }

  // 2. Punctuation Score (0-100)
  // Humans typically have 300ms-800ms cognitive pause after punctuation
  // AI/Bots have near-zero or perfectly constant pause
  const punctuationScore = calculatePunctuationScore(
    sessionData.averagePunctuationPause || 0,
    sessionData.punctuationPauseStdDev || 0
  );
  if (punctuationScore < 30) {
    riskFlags.push('ANOMALOUS_PUNCTUATION_PAUSES: Unnatural pause patterns');
  }

  // 3. Correction Score (0-100)
  // 0 backspaces over 1000+ characters is high-risk for AI-generated text
  const correctionScore = calculateCorrectionScoreAdvanced(
    sessionData.backspaceRatio || 0,
    sessionData.totalCharacters || 0,
    sessionData.correctionClusters || 0,
    sessionData.averageCorrectionLatency || 0
  );
  if ((sessionData.totalCharacters || 0) > 500 && (sessionData.backspaceRatio || 0) === 0) {
    riskFlags.push('ZERO_CORRECTIONS: No backspaces detected in long text');
  }

  // 4. Burst Score (0-100)
  // Burst variance < 10% indicates potential script/bot
  const burstScore = calculateBurstScore(
    sessionData.burstVariance || 0,
    sessionData.isPotentialBot || false,
    sessionData.burstLengthStdDev || 0,
    sessionData.burstPauseStdDev || 0
  );
  if (sessionData.isPotentialBot) {
    riskFlags.push('CONSTANT_SPEED: Minimal variance in typing speed detected');
  }

  // 5. Paste Score (0-100)
  // ANY paste event is suspicious in authorship verification
  const pasteScore = calculatePasteScore(
    sessionData.totalPasteCount || 0,
    sessionData.totalPastedLength || 0,
    sessionData.totalCharacters || 0,
    sessionData.largePasteEvents?.length || 0
  );
  if (sessionData.totalPasteCount && sessionData.totalPasteCount > 0) {
    const pasteRatio = (sessionData.totalCharacters || 0) > 0 ? ((sessionData.totalPastedLength || 0) / (sessionData.totalCharacters || 1)) * 100 : 0;
    riskFlags.push(`PASTE_DETECTED: ${pasteRatio.toFixed(1)}% of text was pasted (${sessionData.totalPasteCount} paste event${sessionData.totalPasteCount > 1 ? 's' : ''})`);
  }

  // 6. Focus Score (0-100)
  // Tab switching is highly suspicious for authorship verification
  const focusScore = calculateFocusScore(
    sessionData.timeSpentOffPage || 0,
    sessionData.sessionDuration || 0,
    sessionData.blurCount || 0
  );
  if (sessionData.blurCount && sessionData.blurCount >= 2) {
    riskFlags.push(`TAB_SWITCHING: User switched tabs ${sessionData.blurCount} time${sessionData.blurCount > 1 ? 's' : ''} - potential content source switching`);
  }
  if (focusScore < 30) {
    riskFlags.push('EXCESSIVE_PAGE_ABSENCE: Unusual focus patterns');
  }

  // Calculate weighted overall score
  // Increased paste weight since it's a strong indicator of non-original content
  const weights = {
    rhythm: 0.20,
    punctuation: 0.15,
    correction: 0.15,
    burst: 0.15,
    paste: 0.25,
    focus: 0.10,
  };

  let overallScore = 
    rhythmScore * weights.rhythm +
    punctuationScore * weights.punctuation +
    correctionScore * weights.correction +
    burstScore * weights.burst +
    pasteScore * weights.paste +
    focusScore * weights.focus;

  // If ANY paste occurred, score is automatically 0 regardless of other metrics
  if (sessionData.totalPasteCount && sessionData.totalPasteCount > 0) {
    overallScore = 0;
    riskFlags.push('NON_ORIGINAL_CONTENT: Paste events detected - content cannot be verified as original');
  }

  // Determine confidence level
  let confidenceLevel: 'low' | 'medium' | 'high';
  if (overallScore >= 70) {
    confidenceLevel = 'high';
  } else if (overallScore >= 40) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }

  return {
    score: Math.round(overallScore),
    confidenceLevel,
    riskFlags,
    analysis: {
      rhythmScore: Math.round(rhythmScore),
      punctuationScore: Math.round(punctuationScore),
      correctionScore: Math.round(correctionScore),
      burstScore: Math.round(burstScore),
      pasteScore: Math.round(pasteScore),
      focusScore: Math.round(focusScore),
    },
  };
}

// Helper functions for individual metrics

function softScore(value: number, idealMin: number, idealMax: number, tolerance: number): number {
  // A soft score avoids hard cutoffs: perfect in-range, linear decay outside, and clamps to 0-100.
  if (!Number.isFinite(value) || !Number.isFinite(idealMin) || !Number.isFinite(idealMax) || !Number.isFinite(tolerance)) {
    return 0;
  }

  const min = Math.min(idealMin, idealMax);
  const max = Math.max(idealMin, idealMax);

  if (tolerance <= 0) {
    return value >= min && value <= max ? 100 : 0;
  }

  if (value >= min && value <= max) return 100;

  const distance = value < min ? (min - value) : (value - max);
  const score = 100 * (1 - distance / tolerance);
  return Math.max(0, Math.min(100, score));
}

function calculateRhythmScore(intervalStdDev: number): number {
  // Humans have some timing variability; too-uniform or extremely erratic timing is less human-like.
  return softScore(intervalStdDev, 80, 250, 150);
}

function calculatePunctuationScore(averagePause: number, stdDev: number): number {
  // Pause after punctuation reflects cognition; we expect a loose 200-800ms center with some variability.
  const pauseScore = softScore(averagePause, 200, 800, 400);
  const variabilityScore = softScore(stdDev, 30, 250, 250);

  const score = pauseScore * 0.8 + variabilityScore * 0.2;
  return Math.max(0, Math.min(100, score));
}

function calculateCorrectionScore(backspaceRatio: number, totalChars: number): number {
  // Ideal human ratio: 0.02-0.10 (2-10%)
  // Made more lenient for normal human typing
  if (totalChars > 1000 && backspaceRatio === 0) return 30;
  if (totalChars > 500 && backspaceRatio === 0) return 50;
  
  if (backspaceRatio < 0.01) return 60;
  if (backspaceRatio < 0.02) return 75;
  if (backspaceRatio <= 0.10) return 95;
  if (backspaceRatio <= 0.20) return 85;
  if (backspaceRatio <= 0.30) return 70;
  return 50; // Too many corrections might indicate struggle
}

function calculateCorrectionScoreAdvanced(
  backspaceRatio: number,
  totalChars: number,
  correctionClusters: number,
  averageCorrectionLatency: number
): number {
  // Frequency is still the strongest signal, but cluster/latency helps distinguish
  // "human correction bursts" from perfectly clean or perfectly mechanical input.
  const frequencyScore = calculateCorrectionScore(backspaceRatio, totalChars);

  // Normalize clusters by length so long texts aren't automatically advantaged.
  const charsPer1k = Math.max(totalChars / 1000, 1);
  const clustersPer1k = correctionClusters / charsPer1k;

  let clusteringScore = 70;
  if (totalChars < 50) {
    // Very short samples are noisy; avoid over-penalizing.
    clusteringScore = 75;
  } else if (correctionClusters === 0) {
    clusteringScore = backspaceRatio > 0 ? 75 : 55;
  } else {
    // A few clusters per 1000 chars feels like natural "fix a word" behavior.
    clusteringScore = 70 + clustersPer1k * 15;
  }
  clusteringScore = Math.max(0, Math.min(100, clusteringScore));

  let latencyScore = 70;
  if (averageCorrectionLatency <= 0) {
    latencyScore = backspaceRatio === 0 ? 60 : 70;
  } else if (averageCorrectionLatency < 40) {
    latencyScore = 30; // suspiciously fast
  } else if (averageCorrectionLatency < 120) {
    latencyScore = 70;
  } else if (averageCorrectionLatency <= 700) {
    latencyScore = 100;
  } else if (averageCorrectionLatency <= 1500) {
    latencyScore = 80;
  } else if (averageCorrectionLatency <= 3000) {
    latencyScore = 60;
  } else {
    latencyScore = 50;
  }

  const score =
    frequencyScore * 0.55 +
    clusteringScore * 0.20 +
    latencyScore * 0.25;

  // Zero corrections over a non-trivial amount of typing is statistically unlikely for humans.
  // Penalize "too perfect" sessions, but don't make it extreme.
  const perfectTypingCap = (totalChars > 100 && backspaceRatio === 0) ? 35 : 100;

  return Math.max(0, Math.min(perfectTypingCap, Math.min(100, score)));
}

function calculateBurstScore(
  variance: number,
  isPotentialBot: boolean,
  burstLengthStdDev: number = 0,
  burstPauseStdDev: number = 0
): number {
  // Humans vary in speed, burst size, and the pauses between bursts; we score for moderate variability.
  const varianceScore = softScore(variance, 10, 30, 20);
  const lengthScore = softScore(burstLengthStdDev, 3, 12, 6);
  const pauseScore = softScore(burstPauseStdDev, 50, 250, 200);

  const score = varianceScore * 0.5 + lengthScore * 0.25 + pauseScore * 0.25;

  // Keep the existing bot hint as a cap (no signature change), but still compute smoothly.
  const capped = isPotentialBot ? Math.min(40, score) : score;
  return Math.max(0, Math.min(100, capped));
}

function calculatePasteScore(
  pasteCount: number,
  totalPastedLength: number,
  totalChars: number,
  largePasteCount: number
): number {
  // ANY paste event = non-original content
  if (pasteCount === 0) return 100;
  
  // If ANY paste occurred, authenticity is severely compromised
  // regardless of amount
  return 5;
}

function calculateFocusScore(timeOffPage: number, sessionDuration: number, blurCount: number): number {
  if (sessionDuration === 0) return 100;

  // Occasional tab switching is normal; repeated switching + long time away is more suspicious.
  const safeTimeOffPage = Math.max(0, timeOffPage);
  const offPageRatio = Math.min(1, safeTimeOffPage / Math.max(1, sessionDuration));

  let blurScore = 100;
  if (blurCount <= 0) blurScore = 100;
  else if (blurCount === 1) blurScore = 95;
  else if (blurCount <= 3) blurScore = 70;
  else blurScore = 35;

  let timeScore = 100;
  if (offPageRatio < 0.10) timeScore = 100;
  else if (offPageRatio < 0.30) timeScore = 85;
  else if (offPageRatio < 0.50) timeScore = 60;
  else timeScore = 25;

  const score = blurScore * 0.6 + timeScore * 0.4;
  return Math.max(0, Math.min(100, score));
}
