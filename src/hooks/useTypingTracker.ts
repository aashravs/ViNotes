import { useRef, useState } from "react";
 import { useEffect } from "react";
export function useTypingTracker() {
   
useEffect(() => {
  const interval = setInterval(() => {
    const wpm = (intervalCharCount.current / 5) * 12;
    wpmSeries.current.push(wpm);
    intervalCharCount.current = 0;
  }, 5000);

  return () => clearInterval(interval);
}, []);
  //  this is the state for UI
  const [status, setStatus] = useState("Idle");

  // these are the REFS for performance
  const startTime = useRef<number | null>(null);
  const lastKeyTime = useRef<number | null>(null);

  const totalChars = useRef(0);
  const intervals = useRef<number[]>([]);
  const wpmSeries = useRef<number[]>([]);

  const pauseCount = useRef(0);
  const longPauses = useRef<number[]>([]);
  const punctuationPauses = useRef<number[]>([]);

  const backspaceCount = useRef(0);
  const pasteCount = useRef(0);
  const pastedLength = useRef(0);

  const lastChar = useRef<string | null>(null);

  const intervalCharCount = useRef(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // the handle key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const now = Date.now();

    if (!startTime.current) startTime.current = now;

    // so, this tracks interval tracking 
    if (lastKeyTime.current) {
      const diff = now - lastKeyTime.current;
      intervals.current.push(diff);

      // and this will track pause detection
      if (diff > 2000) {
        pauseCount.current++;
        longPauses.current.push(diff);
        setStatus("Thinking...");
      } else {
        setStatus("Typing...");
      }

      // this detects the punctuation pause
      if (lastChar.current && /[.,!?]/.test(lastChar.current)) {
        if (diff > 500) {
          punctuationPauses.current.push(diff);
        }
      }
    }

    lastKeyTime.current = now;

    // this will take care of the backspace tracking 
    if (e.key === "Backspace") {
      backspaceCount.current++;
    } else if (e.key.length === 1) {
      totalChars.current++;
      intervalCharCount.current++;
      lastChar.current = e.key;
    }

    // this just detects inactivity  and basically ends the session after 5sec of inactivity
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setStatus("Session Ended");
      computeFinalMetrics();
    }, 5000);
  };

  // This feature takes care of PASTE 
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");

    pasteCount.current++;
    pastedLength.current += pastedText.length;
  };

  // this will track the WPM every 5 seconds and push it to the wpmSeries array for later analysis. assumes char of length 5 btw
  setInterval(() => {
    const wpm = (intervalCharCount.current / 5) * 12;
    wpmSeries.current.push(wpm);
    intervalCharCount.current = 0;
  }, 5000);

  // Will show the final metrics after 5 sec of inactivity (session end basically) 
  const [finalData, setFinalData] = useState<any>(null);

  const computeFinalMetrics = () => {
    if (!startTime.current) return;

    const endTime = Date.now();
    const totalTime = endTime - startTime.current;

    const minutes = totalTime / 60000;
    const avgWPM = (totalChars.current / 5) / minutes;

    setFinalData({
      totalChars: totalChars.current,
      totalTime,
      avgWPM,
      intervals: intervals.current,
      wpmSeries: wpmSeries.current,
      pauseCount: pauseCount.current,
      longPauses: longPauses.current,
      punctuationPauses: punctuationPauses.current,
      backspaceCount: backspaceCount.current,
      pasteCount: pasteCount.current,
      pastedLength: pastedLength.current
    });
  };

  return {
    status,
    handleKeyDown,
    handlePaste,
    finalData
  };
}