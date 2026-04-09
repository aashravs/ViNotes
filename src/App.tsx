import React from "react";
import { useTypingTracker } from "./hooks/useTypingTracker";
import Editor from "./components/Editor";

function App() {
  const tracker = useTypingTracker(); // creates ONE shared instance

  return (
    <div style={{ padding: "20px" }}>
      <h1>Vi-Notes</h1>

      <Editor
        handleKeyDown={tracker.handleKeyDown}//this will send events into the hook
        handlePaste={tracker.handlePaste}
      />
        
      <h3>Status: {tracker.status}</h3>

      {tracker.finalData && (  //now this will olny show data after the session ends
        <pre>{JSON.stringify(tracker.finalData, null, 2)}</pre>
      )}
    </div>
  );
}

export default App;