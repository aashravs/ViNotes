import React, { useState } from "react";

const editorStyles = {
  textarea: {
    width: "calc(100% - 2px)",
    minHeight: "350px",
    padding: "16px",
    fontSize: "16px",
    lineHeight: "30px",
    fontFamily: "'Georgia', 'Times New Roman', Times, serif",
    border: "none",
    borderRadius: "0",
    outline: "none",
    resize: "vertical" as const,
    transition: "all 0.2s ease",
    backgroundColor: "transparent",
    color: "#2c3e50",
    boxSizing: "border-box" as const,
  },
};

export default function Editor({ handleKeyDown, handlePaste, handleFocus, handleBlur }: any) {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleFocusEvent = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (handleFocus) handleFocus();
  };

  const handleBlurEvent = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (handleBlur) handleBlur();
  };

  return (
    <textarea
      value={text} 
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocusEvent}
      onBlur={handleBlurEvent}
      style={{
        ...editorStyles.textarea,
        backgroundColor: isFocused ? "rgba(102, 126, 234, 0.05)" : "transparent",
      }}
      placeholder="Start typing your text here..."
    />
  );
}