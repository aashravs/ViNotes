import React, { useState } from "react";
export default function Editor({ handleKeyDown, handlePaste }: any) {
  const [text, setText] = useState("");

  return (
    <textarea
      value={text} //react controls the text so the ui stays consisten
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown} //this tracks every key pressed so yeah it is our main datasource
      onPaste={handlePaste} //self explanatory basically
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