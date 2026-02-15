import { useState } from "react";

interface InlineAddRowProps {
  placeholder: string;
  onAdd: (name: string) => void;
}

/**
 * Inline input for adding new entities.
 */
export function InlineAddRow({ placeholder, onAdd }: InlineAddRowProps) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");

  const handleActivate = () => {
    setActive(true);
  };

  const handleCommit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
    }
    setValue("");
    setActive(false);
  };

  const handleCancel = () => {
    setValue("");
    setActive(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!active) {
    return (
      <div
        data-inline-add
        onClick={handleActivate}
        style={{
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 6,
          paddingBottom: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "#8a8680",
          cursor: "pointer",
          transition: "background-color 0.12s ease",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        <span>{placeholder}</span>
      </div>
    );
  }

  return (
    <div
      data-inline-add
      style={{
        paddingLeft: 16,
        paddingRight: 12,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "1px solid rgba(0,0,0,0.16)",
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 12,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}
