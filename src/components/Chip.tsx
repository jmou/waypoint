/**
 * Shared Chip component for rendering entity mentions.
 *
 * Used in the notes editor (via ChipExtension node view), the selection
 * popover, the map footer, and slash command results. Matches the mockup
 * design from two-pane-v12.jsx exactly.
 *
 * Chip anatomy:
 *   Place:      [pin icon | name]
 *   Experience: [name | pin? | clock? | ¥amount?]
 *
 * Each indicator section is independently clickable and has hover effects.
 */

import React, { useCallback } from "react";

// ─── Colors (must match design tokens) ───

const TYPE_COLORS = {
  place: "#a33d22",
  experience: "#2d5f82",
} as const;

const BLUE_TEXT = "#1e4a6a";
const ACCENT = "#a33d22";

// ─── Icon components ───

export function PinIcon({ size = 10, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" />
      <circle cx="8" cy="6" r="1.5" />
    </svg>
  );
}

export function ClockIcon({ size = 10, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

// ─── Chip props ───

export interface ChipProps {
  children: React.ReactNode;
  type: "place" | "experience";
  selected?: boolean;
  highlighted?: boolean;
  small?: boolean;
  /** Click on the name area — select only */
  onClick?: (e: React.MouseEvent) => void;
  /** Click on the place pin icon — select + navigate to map */
  onPlaceIconClick?: (e: React.MouseEvent) => void;
  /** Click on the clock icon — select + navigate to schedule */
  onClockClick?: (e: React.MouseEvent) => void;
  /** Click on the expense amount — select + navigate to expenses */
  onExpenseClick?: (e: React.MouseEvent) => void;
  /** Whether the experience has a schedule */
  scheduled?: boolean;
  /** Expense amount (null = not an expense) */
  amount?: number | null;
  /** Currency symbol to show before the amount */
  currencySymbol?: string;
  /** Associated place name (for experience chips) */
  placeName?: string | null;
}

// ─── Indicator section with hover effect ───

function IndicatorSection({
  onClick,
  selected,
  color,
  defaultOpacity,
  hoverBgColor,
  style,
  children,
  title,
}: {
  onClick?: (e: React.MouseEvent) => void;
  selected: boolean;
  color: string;
  defaultOpacity: number;
  hoverBgColor: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  title?: string;
}) {
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.style.opacity = "1";
    if (!selected) {
      e.currentTarget.style.background = hoverBgColor;
    }
  }, [selected, hoverBgColor]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.style.opacity = String(defaultOpacity);
    e.currentTarget.style.background = "transparent";
  }, [defaultOpacity]);

  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 4px",
        color,
        cursor: "pointer",
        opacity: defaultOpacity,
        transition: "opacity 0.1s, background 0.1s",
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </span>
  );
}

// ─── Chip component ───

export function Chip({
  children,
  type,
  selected: sel = false,
  highlighted: hl = false,
  small = false,
  onClick,
  onPlaceIconClick,
  onClockClick,
  onExpenseClick,
  scheduled,
  amount,
  currencySymbol = "¥",
  placeName,
}: ChipProps) {
  const color = TYPE_COLORS[type] || "#555249";
  const showSel = sel;
  const showHL = hl && !sel;
  const fg = showSel ? "#fff" : color;
  const dividerColor = showSel ? "rgba(255,255,255,0.25)" : `${color}20`;

  const divider = () => (
    <span style={{
      width: 1,
      alignSelf: "stretch",
      background: dividerColor,
      margin: "0 1px",
    }} />
  );

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0,
      background: showSel ? color : showHL ? `${color}12` : `${color}05`,
      color: fg,
      borderRadius: 5,
      fontWeight: 600,
      fontSize: small ? 10 : 11.5,
      cursor: "pointer",
      whiteSpace: "nowrap",
      border: showSel
        ? `1.5px solid ${color}`
        : showHL
          ? `1.5px solid ${color}50`
          : `1px solid ${color}10`,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      transition: "all 0.12s",
      overflow: "hidden",
      verticalAlign: "baseline",
      position: "relative",
      top: -0.5,
    }}>
      {/* Place chip: icon | name */}
      {type === "place" && (
        <IndicatorSection
          onClick={onPlaceIconClick}
          selected={showSel}
          color={fg}
          defaultOpacity={showSel ? 0.85 : 0.65}
          hoverBgColor={`${color}0a`}
          style={{
            padding: "2px 4px 2px 5px",
            borderRight: `1px solid ${dividerColor}`,
          }}
        >
          <PinIcon size={10} color={fg} />
        </IndicatorSection>
      )}

      {/* Name */}
      <span
        onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
        style={{
          padding: type === "place" ? "1px 6px 1px 5px" : "1px 4px 1px 6px",
        }}
      >
        {children}
      </span>

      {/* Experience place indicator */}
      {placeName && type === "experience" && (
        <>
          {divider()}
          <IndicatorSection
            onClick={onPlaceIconClick}
            selected={showSel}
            color={showSel ? "rgba(255,255,255,0.8)" : ACCENT}
            defaultOpacity={showSel ? 0.9 : 0.7}
            hoverBgColor={`${ACCENT}08`}
            title={placeName}
          >
            <PinIcon size={10} color={showSel ? "rgba(255,255,255,0.8)" : ACCENT} />
          </IndicatorSection>
        </>
      )}

      {/* Schedule indicator */}
      {scheduled && (
        <>
          {divider()}
          <IndicatorSection
            onClick={onClockClick}
            selected={showSel}
            color={showSel ? "rgba(255,255,255,0.8)" : BLUE_TEXT}
            defaultOpacity={showSel ? 0.9 : 0.7}
            hoverBgColor={`#2d5f8208`}
          >
            <ClockIcon size={9} color={showSel ? "rgba(255,255,255,0.8)" : BLUE_TEXT} />
          </IndicatorSection>
        </>
      )}

      {/* Amount indicator */}
      {amount != null && (
        <>
          {divider()}
          <IndicatorSection
            onClick={onExpenseClick}
            selected={showSel}
            color={showSel ? "rgba(255,255,255,0.85)" : BLUE_TEXT}
            defaultOpacity={showSel ? 0.9 : 0.75}
            hoverBgColor={`#2d5f8208`}
            style={{ padding: "2px 5px 2px 4px", fontSize: 10, fontWeight: 700 }}
          >
            {currencySymbol}{amount.toLocaleString()}
          </IndicatorSection>
        </>
      )}

      {/* Trailing space for bare experience chips */}
      {!scheduled && amount == null && !placeName && !small && type !== "place" && (
        <span style={{ width: 3 }} />
      )}
    </span>
  );
}
