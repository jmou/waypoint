/**
 * ScheduleView — chronological list of experiences grouped by date.
 *
 * Features:
 * - Date range header with mini calendar pickers
 * - Timezone indicator with picker
 * - Day groups with experience rows sorted by time
 * - Inline time editing (click time → text input → blur/enter commits)
 * - Drag-and-drop between dates
 * - Unscheduled section at bottom
 * - Selection/highlighting with inverted/tinted treatment
 */

import React, { useState, useCallback, useRef } from "react";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import {
  computeHighlighted,
  getExperiencesForDate,
  getUnscheduledExperiences,
  getScheduledDates,
  getSubtreeCost,
  EntityMap,
} from "../entities/helpers";
import {
  Experience,
  EntityId,
  isExperience,
  CURRENCY_SYMBOLS,
} from "../entities/types";
import { PinIcon, ClockIcon } from "./Chip";
import { MiniCalendar } from "./MiniCalendar";
import { TimezonePicker } from "./TimezonePicker";

// ─── Colors ───

const C = {
  bg: "#f8f7f5",
  surface: "#ffffff",
  surfaceAlt: "#f0efec",
  border: "rgba(0,0,0,0.09)",
  borderStrong: "rgba(0,0,0,0.16)",
  text: "#1a1917",
  textMuted: "#555249",
  textDim: "#8a8680",
  accent: "#a33d22",
  blue: "#2d5f82",
  blueText: "#1e4a6a",
  highlightBg: "rgba(45,95,130,0.08)",
  highlightBorder: "rgba(45,95,130,0.28)",
};

// ─── Helpers ───

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtDay(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function fmtFullDay(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/**
 * Normalize time input to consistent 12-hour format with lowercase am/pm.
 * Examples:
 *   "1pm" → "1:00 pm"
 *   "1:30PM" → "1:30 pm"
 *   "13:00" → "1:00 pm" (converts 24-hour to 12-hour)
 *   "9:30" → "9:30 am" (assumes am for morning hours)
 *   "0:00" → "12:00 am"
 *   "12:00" → "12:00 pm"
 */
function normalizeTime(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";

  // Pattern: optional hour, optional colon+minutes, optional space, optional am/pm
  // Matches: "1pm", "1:30pm", "1:30 pm", "13:00", "9:30", etc.
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?:\s*)?(am|pm)?$/);

  if (!match) {
    // If it doesn't match our expected patterns, return as-is (user can type freeform)
    return input.trim();
  }

  let [, hourStr, minutes = "00", period] = match;
  let hour = parseInt(hourStr, 10);

  // Validate hour and minutes
  if (hour > 23 || parseInt(minutes, 10) > 59) {
    return input.trim(); // Invalid time, return as-is
  }

  // Convert to 12-hour format if no period specified
  if (!period) {
    if (hour === 0) {
      hour = 12;
      period = "am";
    } else if (hour < 12) {
      period = "am";
    } else if (hour === 12) {
      period = "pm";
    } else {
      hour = hour - 12;
      period = "pm";
    }
  } else {
    // Period was specified - normalize hour if needed
    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour = hour - 12;
    }
  }

  return `${hour}:${minutes} ${period}`;
}

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function formatCost(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
  return `${sym}${amount.toLocaleString()}`;
}

// ─── Timezone label ───

function getTimezoneLabel(tz: string): string {
  const offsets: Record<string, string> = {
    "Asia/Tokyo": "UTC+09:00",
    "Asia/Seoul": "UTC+09:00",
    "Asia/Shanghai": "UTC+08:00",
    "Australia/Melbourne": "UTC+11:00",
    UTC: "UTC+00:00",
  };
  const offset = offsets[tz] || "";
  return offset ? `${tz} (${offset})` : tz;
}

// ─── ScheduleView ───

export function ScheduleView() {
  const entities = useEntityStore((s) => s.entities);
  const trip = useEntityStore((s) => s.trip);
  const updateExperience = useEntityStore((s) => s.updateExperience);
  const updateTrip = useEntityStore((s) => s.updateTrip);
  const selected = useSelectionStore((s) => s.selected);
  const handleClick = useSelectionStore((s) => s.handleClick);
  const handleDayClick = useSelectionStore((s) => s.handleDayClick);

  const highlighted = computeHighlighted(entities, selected);

  // Local UI state
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const [timeValue, setTimeValue] = useState("");
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  if (!trip) return null;

  const dateRangeStart = trip.dateRange.start;
  const dateRangeEnd = trip.dateRange.end;
  const timezone = trip.timezone;
  const dates = generateDateRange(dateRangeStart, dateRangeEnd);
  const scheduledDates = getScheduledDates(entities);
  const unscheduled = getUnscheduledExperiences(entities);

  // ─── Date range updates ───

  const handleStartDateChange = useCallback(
    (date: string) => {
      updateTrip({ dateRange: { start: date, end: dateRangeEnd } });
    },
    [updateTrip, dateRangeEnd]
  );

  const handleEndDateChange = useCallback(
    (date: string) => {
      updateTrip({ dateRange: { start: dateRangeStart, end: date } });
    },
    [updateTrip, dateRangeStart]
  );

  // ─── Time editing ───

  const commitTime = useCallback(
    (expId: string, newTime: string) => {
      const entity = entities.get(expId);
      if (!entity || !isExperience(entity) || !entity.schedule) return;
      const normalized = normalizeTime(newTime);
      if (normalized) {
        updateExperience(expId, {
          schedule: { ...entity.schedule, time: normalized },
        });
      }
      setEditingTime(null);
    },
    [entities, updateExperience]
  );

  // ─── Drag-and-drop between dates ───

  const handleDrop = useCallback(
    (date: string, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverDate(null);
      const expId = e.dataTransfer.getData("text/plain");
      if (!expId) return;
      const entity = entities.get(expId);
      if (!entity || !isExperience(entity)) return;
      updateExperience(expId, {
        schedule: {
          date,
          time: entity.schedule?.time || null,
          timezone: timezone,
        },
      });
    },
    [entities, updateExperience, timezone]
  );

  // ─── Day header click — select all experiences on that date ───

  const handleDayHeaderClick = useCallback(
    (date: string, e: React.MouseEvent) => {
      const exps = getExperiencesForDate(entities, date);
      const ids = exps.map((exp) => exp.id);
      if (ids.length === 0) return;
      handleDayClick(ids, { ctrlKey: e.ctrlKey, metaKey: e.metaKey });
    },
    [entities, handleDayClick]
  );

  return (
    <div
      data-schedule-view
      style={{
        overflow: "auto",
        height: "100%",
        padding: "8px 0",
        position: "relative",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ─── Date range header ─── */}
      <div
        data-schedule-header
        style={{
          padding: "6px 16px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, color: C.textDim }}>Schedule:</span>

        {/* Start date */}
        <span style={{ position: "relative" }}>
          <span
            data-schedule-start-date
            onClick={() => {
              setEditingStart(!editingStart);
              setEditingEnd(false);
              setShowTzPicker(false);
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.blue,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
              border: `1px solid ${editingStart ? C.blue : "transparent"}`,
              transition: "all 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!editingStart) e.currentTarget.style.background = C.surfaceAlt;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {fmtDate(dateRangeStart)}
          </span>
          {editingStart && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                zIndex: 60,
              }}
            >
              <MiniCalendar
                value={dateRangeStart}
                scheduledDates={scheduledDates}
                onSelect={handleStartDateChange}
                onClose={() => setEditingStart(false)}
              />
            </div>
          )}
        </span>

        <span style={{ color: C.textDim }}>—</span>

        {/* End date */}
        <span style={{ position: "relative" }}>
          <span
            data-schedule-end-date
            onClick={() => {
              setEditingEnd(!editingEnd);
              setEditingStart(false);
              setShowTzPicker(false);
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.blue,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
              border: `1px solid ${editingEnd ? C.blue : "transparent"}`,
              transition: "all 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!editingEnd) e.currentTarget.style.background = C.surfaceAlt;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {fmtDate(dateRangeEnd)}
          </span>
          {editingEnd && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                zIndex: 60,
              }}
            >
              <MiniCalendar
                value={dateRangeEnd}
                scheduledDates={scheduledDates}
                onSelect={handleEndDateChange}
                onClose={() => setEditingEnd(false)}
              />
            </div>
          )}
        </span>
      </div>

      {/* ─── Day groups ─── */}
      {dates.map((date, di) => {
        const exps = getExperiencesForDate(entities, date);
        const isDragOver = dragOverDate === date;
        return (
          <div
            key={date}
            data-schedule-day={date}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverDate(date);
            }}
            onDragLeave={() => setDragOverDate(null)}
            onDrop={(e) => handleDrop(date, e)}
            style={{
              marginBottom: 2,
              background: isDragOver ? C.highlightBg : "transparent",
              borderRadius: 6,
              margin: "0 4px",
              transition: "background 0.1s",
            }}
          >
            {/* Day header */}
            <div
              data-day-header={date}
              onClick={(e) => handleDayHeaderClick(date, e)}
              style={{
                padding: "8px 12px 4px",
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                {fmtDate(date)}
              </span>
              <span style={{ fontSize: 11, color: C.textDim }}>
                {fmtFullDay(date)}
              </span>
            </div>

            {/* Timezone on first day */}
            {di === 0 && (
              <div
                style={{
                  padding: "2px 12px 6px 20px",
                  position: "relative",
                }}
              >
                <span
                  data-timezone-indicator
                  onClick={() => {
                    setShowTzPicker(!showTzPicker);
                    setEditingStart(false);
                    setEditingEnd(false);
                  }}
                  style={{
                    fontSize: 10,
                    color: C.textDim,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: 3,
                    transition: "all 0.1s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.surfaceAlt;
                    e.currentTarget.style.color = C.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = C.textDim;
                  }}
                >
                  🌐 {getTimezoneLabel(timezone)}
                </span>
                {showTzPicker && (
                  <div
                    style={{
                      position: "absolute",
                      left: 20,
                      top: "100%",
                      marginTop: 2,
                      zIndex: 60,
                    }}
                  >
                    <TimezonePicker
                      value={timezone}
                      onSelect={(tz) => updateTrip({ timezone: tz })}
                      onClose={() => setShowTzPicker(false)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Experience rows */}
            {exps.map((exp) => (
              <ScheduleRow
                key={exp.id}
                exp={exp}
                entities={entities}
                isSelected={selected.has(exp.id)}
                isHighlighted={highlighted.has(exp.id)}
                isEditingTime={editingTime === exp.id}
                timeValue={timeValue}
                onRowClick={(e) => handleClick(exp.id, e)}
                onStartEditTime={() => {
                  setEditingTime(exp.id);
                  setTimeValue(exp.schedule?.time || "");
                }}
                onTimeValueChange={setTimeValue}
                onCommitTime={(val) => commitTime(exp.id, val)}
                onCancelTimeEdit={() => setEditingTime(null)}
              />
            ))}

            {/* Add or link experience prompt */}
            <div
              data-schedule-add={date}
              style={{
                padding: "4px 12px 4px 24px",
                fontSize: 11,
                color: C.textDim,
                cursor: "pointer",
                opacity: 0.4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.4";
              }}
            >
              + Add or link experience...
            </div>

            {/* Day divider */}
            <div
              style={{
                height: 1,
                background: C.border,
                margin: "4px 12px",
              }}
            />
          </div>
        );
      })}

      {/* ─── Unscheduled section ─── */}
      {unscheduled.length > 0 && (
        <div data-unscheduled-section style={{ marginTop: 8 }}>
          <div
            style={{
              padding: "8px 16px 4px",
              fontSize: 12,
              fontWeight: 700,
              color: C.textDim,
            }}
          >
            Unscheduled
          </div>
          {unscheduled.map((exp) => (
            <UnscheduledRow
              key={exp.id}
              exp={exp}
              isSelected={selected.has(exp.id)}
              isHighlighted={highlighted.has(exp.id)}
              onClick={(e) => handleClick(exp.id, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Schedule Row (experience within a day) ───

function ScheduleRow({
  exp,
  entities,
  isSelected,
  isHighlighted,
  isEditingTime,
  timeValue,
  onRowClick,
  onStartEditTime,
  onTimeValueChange,
  onCommitTime,
  onCancelTimeEdit,
}: {
  exp: Experience;
  entities: EntityMap;
  isSelected: boolean;
  isHighlighted: boolean;
  isEditingTime: boolean;
  timeValue: string;
  onRowClick: (e: React.MouseEvent) => void;
  onStartEditTime: () => void;
  onTimeValueChange: (val: string) => void;
  onCommitTime: (val: string) => void;
  onCancelTimeEdit: () => void;
}) {
  const isSel = isSelected;
  const isHl = isHighlighted && !isSelected;

  // Get associated place name
  const place =
    exp.placeIds.length > 0 ? entities.get(exp.placeIds[0]) : undefined;
  const placeName = place ? place.name : null;

  // Get subtree cost
  const costInfo = getSubtreeCost(entities, exp.id);
  const hasCost = costInfo.byCurrency.size > 0;

  return (
    <div
      data-schedule-row={exp.id}
      data-entity-id={exp.id}
      data-selected={isSel ? "true" : undefined}
      data-highlighted={isHl ? "true" : undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", exp.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onRowClick}
      style={{
        padding: "6px 12px 6px 16px",
        cursor: "grab",
        background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
        border: isSel
          ? `1.5px solid ${C.blue}`
          : isHl
            ? `1px solid ${C.highlightBorder}`
            : "1px solid transparent",
        borderRadius: 6,
        margin: "1px 4px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.12s",
      }}
    >
      {/* Editable time */}
      {isEditingTime ? (
        <input
          data-time-input={exp.id}
          autoFocus
          value={timeValue}
          onChange={(e) => onTimeValueChange(e.target.value)}
          onBlur={() => onCommitTime(timeValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitTime(timeValue);
            if (e.key === "Escape") onCancelTimeEdit();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 64,
            fontSize: 11,
            color: C.text,
            background: C.surfaceAlt,
            border: `1px solid ${C.blue}`,
            borderRadius: 4,
            padding: "2px 4px",
            outline: "none",
            fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
          }}
        />
      ) : (
        <span
          data-time-display={exp.id}
          onClick={(e) => {
            e.stopPropagation();
            onStartEditTime();
          }}
          style={{
            fontSize: 11,
            color: isSel ? "rgba(255,255,255,0.7)" : C.textMuted,
            width: 70,
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
            cursor: "text",
            borderRadius: 4,
            padding: "3px 4px",
            margin: "-3px -4px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => {
            if (!isSel) {
              e.currentTarget.style.background = C.surfaceAlt;
              e.currentTarget.style.color = C.text;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSel) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = C.textMuted;
            }
          }}
        >
          <ClockIcon
            size={9}
            color={isSel ? "rgba(255,255,255,0.7)" : "currentColor"}
          />
          {exp.schedule?.time || "—"}
        </span>
      )}

      {/* Name + place */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          data-schedule-row-name
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: isSel ? "#fff" : C.text,
          }}
        >
          {exp.name}
        </div>
        {placeName && (
          <div
            data-schedule-row-place
            style={{
              fontSize: 10,
              color: isSel ? "rgba(255,255,255,0.7)" : C.accent,
              marginTop: 1,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <PinIcon
              size={8}
              color={isSel ? "rgba(255,255,255,0.7)" : C.accent}
            />
            {placeName}
          </div>
        )}
      </div>

      {/* Subtree cost */}
      {hasCost && (
        <span
          data-schedule-row-cost
          style={{
            fontSize: 10,
            color: isSel ? "rgba(255,255,255,0.6)" : C.blueText,
            opacity: isSel ? 1 : 0.6,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {costInfo.total}
        </span>
      )}
    </div>
  );
}

// ─── Unscheduled Row ───

function UnscheduledRow({
  exp,
  isSelected,
  isHighlighted,
  onClick,
}: {
  exp: Experience;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const isSel = isSelected;
  const isHl = isHighlighted && !isSelected;

  return (
    <div
      data-unscheduled-row={exp.id}
      data-entity-id={exp.id}
      data-selected={isSel ? "true" : undefined}
      data-highlighted={isHl ? "true" : undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", exp.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      style={{
        padding: "6px 12px 6px 16px",
        cursor: "grab",
        background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
        border: isSel
          ? `1.5px solid ${C.blue}`
          : isHl
            ? `1px solid ${C.highlightBorder}`
            : "1px solid transparent",
        borderRadius: 6,
        margin: "1px 4px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: isSel ? 1 : 0.65,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: isSel ? "rgba(255,255,255,0.7)" : C.textDim,
          width: 64,
          fontStyle: "italic",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <ClockIcon
          size={9}
          color={isSel ? "rgba(255,255,255,0.7)" : C.textDim}
        />
        drag to schedule
      </span>
      <div style={{ flex: 1 }}>
        <div
          data-unscheduled-row-name
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: isSel ? "#fff" : C.text,
          }}
        >
          {exp.name}
        </div>
      </div>
    </div>
  );
}
