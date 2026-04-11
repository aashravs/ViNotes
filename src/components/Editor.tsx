import React, { useState } from "react";

const editorStyles = {
  textarea: {
    width: "calc(100% - 2px)",
    minHeight: "350px",
    padding: "22px",
    fontSize: "18px",
    lineHeight: "32px",
    fontFamily: "'Georgia', 'Times New Roman', Times, serif",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "12px",
    outline: "none",
    resize: "vertical" as const,
    transition: "background-color 0.15s ease, box-shadow 0.15s ease",
    backgroundColor: "#fffdfb",
    color: "#2b211c",
    letterSpacing: "0.2px",
    caretColor: "#b06040",
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
        backgroundColor: isFocused ? "#fffdfb" : "#fffdfb",
        borderColor: isFocused ? "#b06040" : "rgba(0,0,0,0.08)",
        boxShadow: isFocused
          ? "inset 0 2px 4px rgba(0,0,0,0.06)"
          : "inset 0 2px 4px rgba(0,0,0,0.06)",
      }}
      placeholder="Start typing your text here..."
    />
  );
}