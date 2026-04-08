import React, { useState } from "react";
export default function Editor({ handleKeyDown, handlePaste }: any) {
  const [text, setText] = useState("");

  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      style={{
        width: "100%",
        height: "300px",
        padding: "10px",
        fontSize: "16px"
      }}
      placeholder="Start typing..."
    />
  );
}