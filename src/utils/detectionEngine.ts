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
  const correctionScore = calculateCorrectionScore(
    sessionData.backspaceRatio || 0,
    sessionData.totalCharacters || 0
  );
  if (correctionScore < 20) {
    riskFlags.push('ZERO_CORRECTIONS: No backspaces detected in long text');
  }

  // 4. Burst Score (0-100)
  // Burst variance < 10% indicates potential script/bot
  const burstScore = calculateBurstScore(sessionData.burstVariance || 0, sessionData.isPotentialBot || false);
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
  if (sessionData.blurCount && sessionData.blurCount > 0) {
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

function calculateRhythmScore(intervalStdDev: number): number {
  // Humans typically have stdDev of 100-300ms
  // Bots/virtual keyboards have < 50ms
  // Made more lenient for normal human typing
  if (intervalStdDev < 30) return 20;
  if (intervalStdDev < 80) return 50;
  if (intervalStdDev < 150) return 80;
  if (intervalStdDev < 250) return 95;
  return 100;
}

function calculatePunctuationScore(averagePause: number, stdDev: number): number {
  // Ideal human range: 300-800ms with some variance
  // Made more lenient for normal human typing
  if (averagePause < 50) return 20; // Very fast but possible for quick typists
  if (averagePause < 200) return 60;
  if (averagePause > 800 && averagePause < 1200) return 80;
  if (averagePause >= 200 && averagePause <= 800) {
    // Check variance - humans have variance, bots don't
    if (stdDev < 30) return 70; // More lenient variance check
    if (stdDev > 100) return 95;
    return 85;
  }
  if (averagePause >= 1200) return 75; // Very slow but possible
  return 70;
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

function calculateBurstScore(variance: number, isPotentialBot: boolean): number {
  // Made more lenient for normal human typing
  if (isPotentialBot) return 40;
  if (variance < 5) return 50;
  if (variance < 15) return 70;
  if (variance < 30) return 85;
  return 95;
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
  
  // Tab switching is highly suspicious - any tab switch significantly reduces score
  if (blurCount > 0) return 10;
  
  const offPageRatio = timeOffPage / sessionDuration;
  
  // More than 50% time off page is suspicious
  if (offPageRatio > 0.5) return 20;
  if (offPageRatio > 0.3) return 50;
  if (offPageRatio > 0.1) return 80;
  return 100;
}
