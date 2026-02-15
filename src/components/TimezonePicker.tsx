/**
 * TimezonePicker — dropdown for selecting timezone.
 * Used in the Schedule view below the first day header.
 * Matches the mockup in two-pane-v12.jsx.
 */

import React from "react";

interface TimezonePickerProps {
  /** Currently selected timezone (IANA) */
  value: string;
  /** Called when a timezone is selected */
  onSelect: (tz: string) => void;
  /** Called to close the picker */
  onClose: () => void;
}

const COLORS = {
  surface: "#ffffff",
  surfaceAlt: "#f0efec",
  borderStrong: "rgba(0,0,0,0.16)",
  text: "#1a1917",
  blue: "#2d5f82",
};

const TIMEZONES = [
  { id: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { id: "Asia/Seoul", label: "Asia/Seoul (UTC+09:00)" },
  { id: "Asia/Shanghai", label: "Asia/Shanghai (UTC+08:00)" },
  { id: "Australia/Melbourne", label: "Australia/Melbourne (UTC+11:00)" },
  { id: "UTC", label: "UTC" },
];

export function TimezonePicker({ value, onSelect, onClose }: TimezonePickerProps) {
  return (
    <div
      data-timezone-picker
      onClick={(e) => e.stopPropagation()}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.borderStrong}`,
        borderRadius: 8,
        padding: "4px 0",
        width: 240,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 60,
        fontSize: 12,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {TIMEZONES.map((tz) => {
        const isActive = value === tz.id;
        return (
          <div
            key={tz.id}
            data-timezone-option={tz.id}
            onClick={() => {
              onSelect(tz.id);
              onClose();
            }}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              color: isActive ? COLORS.blue : COLORS.text,
              fontWeight: isActive ? 600 : 400,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.surfaceAlt;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {tz.label}
          </div>
        );
      })}
    </div>
  );
}
