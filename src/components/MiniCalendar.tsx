/**
 * MiniCalendar — a small month calendar picker for selecting dates.
 * Used in the Schedule view for editing date range start/end.
 * Matches the mockup in two-pane-v12.jsx.
 */

import React, { useCallback } from "react";

interface MiniCalendarProps {
  /** Currently selected date in "YYYY-MM-DD" format */
  value: string | null;
  /** Set of dates that have scheduled experiences (shown with dots) */
  scheduledDates?: Set<string>;
  /** Month to display (1-indexed). Defaults to 3 (March). */
  month?: number;
  /** Year to display. Defaults to 2026. */
  year?: number;
  /** Called when user picks a date */
  onSelect: (date: string) => void;
  /** Called to close the calendar */
  onClose: () => void;
}

const COLORS = {
  surface: "#ffffff",
  surfaceAlt: "#f0efec",
  borderStrong: "rgba(0,0,0,0.16)",
  text: "#1a1917",
  textDim: "#8a8680",
  blue: "#2d5f82",
};

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function MiniCalendar({
  value,
  scheduledDates,
  month = 3,
  year = 2026,
  onSelect,
  onClose,
}: MiniCalendarProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // Build weeks grid
  const weeks: (number | null)[][] = [];
  let day = 1 - firstDayOfWeek;
  for (let w = 0; w < 6; w++) {
    const wk: (number | null)[] = [];
    for (let d = 0; d < 7; d++, day++) {
      wk.push(day >= 1 && day <= daysInMonth ? day : null);
    }
    weeks.push(wk);
    if (day > daysInMonth) break;
  }

  const valDay = value ? parseInt(value.split("-")[2]) : null;

  const handleDayClick = useCallback(
    (d: number) => {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      onSelect(dateStr);
      onClose();
    },
    [year, month, onSelect, onClose]
  );

  return (
    <div
      data-mini-calendar
      onClick={(e) => e.stopPropagation()}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.borderStrong}`,
        borderRadius: 10,
        padding: 12,
        width: 228,
        boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
        zIndex: 60,
        fontSize: 11,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 12,
          marginBottom: 6,
          textAlign: "center",
        }}
      >
        {MONTH_NAMES[month]} {year}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          textAlign: "center",
        }}
      >
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            style={{
              fontSize: 8,
              fontWeight: 600,
              color: COLORS.textDim,
              padding: "3px 0",
            }}
          >
            {d}
          </div>
        ))}
        {weeks.flat().map((d, i) =>
          d === null ? (
            <div key={i} />
          ) : (
            <CalendarDay
              key={i}
              day={d}
              isSelected={d === valDay}
              hasScheduled={
                scheduledDates
                  ? scheduledDates.has(
                      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                    )
                  : false
              }
              onClick={() => handleDayClick(d)}
            />
          )
        )}
      </div>
    </div>
  );
}

function CalendarDay({
  day,
  isSelected,
  hasScheduled,
  onClick,
}: {
  day: number;
  isSelected: boolean;
  hasScheduled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      data-calendar-day={day}
      onClick={onClick}
      style={{
        width: 28,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 5,
        cursor: "pointer",
        fontWeight: isSelected ? 700 : 400,
        background: isSelected ? COLORS.blue : "transparent",
        color: isSelected ? "#fff" : COLORS.text,
        transition: "background 0.1s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = COLORS.surfaceAlt;
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {day}
      {hasScheduled && !isSelected && (
        <span
          style={{
            position: "absolute",
            bottom: 2,
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: COLORS.blue,
          }}
        />
      )}
    </div>
  );
}
