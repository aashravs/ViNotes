import React from "react";
import { useTypingTracker } from "./hooks/useTypingTracker";
import Editor from "./components/Editor";

function App() {
  const tracker = useTypingTracker();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Vi-Notes</h1>

      <Editor
        handleKeyDown={tracker.handleKeyDown}
        handlePaste={tracker.handlePaste}
      />

      <h3>Status: {tracker.status}</h3>

      {tracker.finalData && (
        <pre>{JSON.stringify(tracker.finalData, null, 2)}</pre>
      )}
    </div>
  );
}

export default App;