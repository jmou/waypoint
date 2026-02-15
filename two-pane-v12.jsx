import { useState, useCallback, useRef } from "react";

const C = {
  bg: "#f8f7f5", surface: "#ffffff", surfaceAlt: "#f0efec",
  border: "rgba(0,0,0,0.09)", borderStrong: "rgba(0,0,0,0.16)",
  text: "#1a1917", textMuted: "#555249", textDim: "#8a8680",
  accent: "#a33d22", blue: "#2d5f82", blueText: "#1e4a6a",
  highlightBg: "rgba(45,95,130,0.08)", highlightBorder: "rgba(45,95,130,0.28)",
  highlightPlaceBg: "rgba(163,61,34,0.06)", highlightPlaceBorder: "rgba(163,61,34,0.22)",
};
const typeColor = { place: C.accent, experience: C.blue };

function ClockIcon({ size = 10, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>);
}
function PinIcon({ size = 10, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" /><circle cx="8" cy="6" r="1.5" /></svg>);
}

// ─── Chip ───
function Chip({ children, type, selected: sel, highlighted: hl, onClick, onClockClick, onExpenseClick, onPlaceIconClick, scheduled, amount, placeName, small }) {
  const color = typeColor[type] || C.textMuted;
  const showSel = sel; const showHL = hl && !sel;
  const fg = showSel ? "#fff" : color;
  const dividerColor = showSel ? "rgba(255,255,255,0.25)" : `${color}20`;
  const divider = (extra) => <span style={{ width: 1, alignSelf: "stretch", background: dividerColor, margin: "0 1px", ...extra }} />;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 0,
      background: showSel ? color : showHL ? `${color}12` : `${color}05`,
      color: fg, borderRadius: 5, fontWeight: 600, fontSize: small ? 10 : 11.5, cursor: "pointer",
      whiteSpace: "nowrap",
      border: showSel ? `1.5px solid ${color}` : showHL ? `1.5px solid ${color}50` : `1px solid ${color}10`,
      fontFamily: "'DM Sans', sans-serif", transition: "all 0.12s",
      overflow: "hidden",
    }}>
      {/* Place chip: icon | name */}
      {type === "place" && (
        <span onClick={(e) => { e.stopPropagation(); onPlaceIconClick?.(e); }}
          style={{ display: "inline-flex", alignItems: "center", padding: "2px 4px 2px 5px", cursor: "pointer", opacity: showSel ? 0.85 : 0.65, transition: "opacity 0.1s, background 0.1s", borderRight: `1px solid ${dividerColor}` }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; if (!showSel) e.currentTarget.style.background = `${color}0a`; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = showSel ? "0.85" : "0.65"; e.currentTarget.style.background = "transparent"; }}>
          <PinIcon size={10} color={fg} />
        </span>
      )}
      <span onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
        style={{ padding: type === "place" ? "1px 6px 1px 5px" : "1px 4px 1px 6px" }}>{children}</span>
      {/* Experience place indicator */}
      {placeName && type === "experience" && (<>
        {divider()}
        <span onClick={(e) => { e.stopPropagation(); onPlaceIconClick?.(e); }}
          title={placeName} style={{ display: "inline-flex", alignItems: "center", padding: "2px 4px", color: showSel ? "rgba(255,255,255,0.8)" : C.accent, cursor: "pointer", opacity: showSel ? 0.9 : 0.7, transition: "opacity 0.1s, background 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; if (!showSel) e.currentTarget.style.background = `${C.accent}08`; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = showSel ? "0.9" : "0.7"; e.currentTarget.style.background = "transparent"; }}>
          <PinIcon size={10} color={showSel ? "rgba(255,255,255,0.8)" : C.accent} />
        </span>
      </>)}
      {scheduled && (<>
        {divider()}
        <span onClick={(e) => { e.stopPropagation(); onClockClick?.(e); }}
          style={{ display: "inline-flex", alignItems: "center", padding: "2px 4px", color: showSel ? "rgba(255,255,255,0.8)" : C.blueText, cursor: "pointer", opacity: showSel ? 0.9 : 0.7, transition: "opacity 0.1s, background 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; if (!showSel) e.currentTarget.style.background = `${C.blue}08`; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = showSel ? "0.9" : "0.7"; e.currentTarget.style.background = "transparent"; }}>
          <ClockIcon size={9} color={showSel ? "rgba(255,255,255,0.8)" : C.blueText} />
        </span>
      </>)}
      {amount != null && (<>
        {divider()}
        <span onClick={(e) => { e.stopPropagation(); onExpenseClick?.(e); }}
          style={{ display: "inline-flex", alignItems: "center", padding: "2px 5px 2px 4px", fontSize: 10, fontWeight: 700, color: showSel ? "rgba(255,255,255,0.85)" : C.blueText, cursor: "pointer", opacity: showSel ? 0.9 : 0.75, transition: "opacity 0.1s, background 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; if (!showSel) e.currentTarget.style.background = `${C.blue}08`; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = showSel ? "0.9" : "0.75"; e.currentTarget.style.background = "transparent"; }}>
          ¥{amount.toLocaleString()}
        </span>
      </>)}
      {!scheduled && amount == null && !placeName && !small && type !== "place" && <span style={{ width: 3 }} />}
    </span>
  );
}

// ─── Data ───
const entityData = {
  kyoto: { type: "place", name: "Kyoto", parent: null, coords: null },
  fushimi: { type: "place", name: "Fushimi Inari", parent: "kyoto", coords: "34.967°N" },
  arashiyama: { type: "place", name: "Arashiyama", parent: "kyoto", coords: "35.010°N" },
  nishiki: { type: "place", name: "Nishiki Market", parent: "kyoto", coords: "35.005°N" },
  kiyomizu: { type: "place", name: "Kiyomizu-dera", parent: "kyoto", coords: "34.995°N" },
  "sake-venue": { type: "place", name: "Sake tasting venue", parent: "kyoto", coords: null },
  "pottery-place": { type: "place", name: "Pottery studio", parent: "kyoto", coords: null },
  osaka: { type: "place", name: "Osaka", parent: null, coords: null },
  dotonbori: { type: "place", name: "Dōtonbori", parent: "osaka", coords: "34.669°N" },

  trip: { type: "experience", name: "Kyoto March 2026", parent: null, places: [], schedDate: null, schedTime: null, amount: null, currency: "JPY" },
  "cultural-pkg": { type: "experience", name: "2-day cultural package", parent: "trip", places: [], schedDate: null, schedTime: null, amount: 12000, currency: "JPY" },
  transport: { type: "experience", name: "Transport", parent: "trip", places: [], schedDate: null, schedTime: null, amount: null, currency: "JPY" },
  accommodation: { type: "experience", name: "Accommodation", parent: "trip", places: [], schedDate: null, schedTime: null, amount: null, currency: "JPY" },
  "nishiki-tour": { type: "experience", name: "Nishiki Market food tour", parent: "trip", places: ["nishiki"], schedDate: "2026-03-15", schedTime: "11:00 AM", amount: null, currency: "JPY" },
  "knife-shop": { type: "experience", name: "Knife shopping", parent: "trip", places: ["nishiki"], schedDate: "2026-03-15", schedTime: "2:00 PM", amount: null, currency: "JPY" },
  "fushimi-hike": { type: "experience", name: "Fushimi Inari sunrise hike", parent: "trip", places: ["fushimi"], schedDate: "2026-03-16", schedTime: "6:00 AM", amount: null, currency: "JPY" },
  "kiyomizu-walk": { type: "experience", name: "Kiyomizu-dera & Ninenzaka", parent: "trip", places: ["kiyomizu"], schedDate: "2026-03-16", schedTime: "2:00 PM", amount: null, currency: "JPY" },
  "sake-evening": { type: "experience", name: "Sake district evening", parent: "cultural-pkg", places: ["sake-venue"], schedDate: "2026-03-16", schedTime: "5:00 PM", amount: null, currency: "JPY" },
  bamboo: { type: "experience", name: "Bamboo grove & Tenryū-ji", parent: "trip", places: ["arashiyama"], schedDate: "2026-03-17", schedTime: "8:40 AM", amount: null, currency: "JPY" },
  "pottery-class": { type: "experience", name: "Pottery workshop", parent: "cultural-pkg", places: ["pottery-place"], schedDate: "2026-03-17", schedTime: "2:00 PM", amount: null, currency: "JPY" },
  "osaka-day": { type: "experience", name: "Dōtonbori street food", parent: "trip", places: ["dotonbori"], schedDate: "2026-03-18", schedTime: "10:00 AM", amount: null, currency: "JPY" },
  "tea-ceremony": { type: "experience", name: "Tea ceremony", parent: "trip", places: [], schedDate: null, schedTime: null, amount: null, currency: "JPY" },
  "nara-trip": { type: "experience", name: "Nara deer park", parent: "trip", places: [], schedDate: null, schedTime: null, amount: null, currency: "JPY" },

  "jr-pass": { type: "experience", name: "JR Pass (7-day)", parent: "transport", places: [], schedDate: null, schedTime: null, amount: 29650, currency: "JPY" },
  ryokan: { type: "experience", name: "Ryokan (2 nights)", parent: "accommodation", places: [], schedDate: null, schedTime: null, amount: 48000, currency: "JPY" },
  "food-tour-cost": { type: "experience", name: "Street food tasting", parent: "nishiki-tour", places: [], schedDate: null, schedTime: null, amount: 3200, currency: "JPY" },
  "knife-cost": { type: "experience", name: "Kitchen knife", parent: "knife-shop", places: [], schedDate: null, schedTime: null, amount: 15000, currency: "JPY" },
  "fox-udon": { type: "experience", name: "Fox udon at hilltop", parent: "fushimi-hike", places: [], schedDate: null, schedTime: null, amount: 850, currency: "JPY" },
  "tenryuji-entry": { type: "experience", name: "Tenryū-ji entry", parent: "bamboo", places: [], schedDate: null, schedTime: null, amount: 500, currency: "JPY" },
  "kiyomizu-entry": { type: "experience", name: "Kiyomizu-dera entry", parent: "kiyomizu-walk", places: [], schedDate: null, schedTime: null, amount: 400, currency: "JPY" },
  "riverside-lunch": { type: "experience", name: "Riverside café lunch", parent: "bamboo", places: [], schedDate: null, schedTime: null, amount: 1800, currency: "JPY" },
  "travel-insurance": { type: "experience", name: "Travel insurance", parent: "transport", places: [], schedDate: null, schedTime: null, amount: 120, currency: "AUD" },
};

function getDescendants(id) {
  const r = new Set(); const q = [id];
  while (q.length) { const c = q.shift(); r.add(c); Object.entries(entityData).forEach(([cid, e]) => { if (e.parent === c && !r.has(cid)) q.push(cid); }); }
  r.delete(id); return r;
}
function subtreeCost(id) {
  let t = entityData[id]?.amount || 0;
  getDescendants(id).forEach((d) => { t += entityData[d]?.amount || 0; }); return t;
}
function getPlaceName(ent) { return ent.places?.length ? entityData[ent.places[0]]?.name : null; }

function fmtDate(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtDay(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }); }
function getExpsForDate(date) {
  return Object.entries(entityData).filter(([, e]) => e.type === "experience" && e.schedDate === date)
    .map(([id, e]) => ({ id, ...e })).sort((a, b) => (a.schedTime || "zzz").localeCompare(b.schedTime || "zzz"));
}
function getUnscheduledExps() {
  const skip = new Set(["trip", "transport", "accommodation", "cultural-pkg"]);
  return Object.entries(entityData).filter(([id, e]) => e.type === "experience" && !e.schedDate && e.amount == null && e.parent && !skip.has(id)).map(([id, e]) => ({ id, ...e }));
}
function computeHighlighted(selected) {
  const hl = new Set();
  selected.forEach((id) => {
    const ent = entityData[id]; if (!ent) return;
    getDescendants(id).forEach((d) => hl.add(d));
    if (ent.type === "experience") (ent.places || []).forEach((p) => hl.add(p));
    if (ent.type === "place") {
      // Highlight experiences at this place
      const placeAndChildren = new Set([id, ...getDescendants(id)]);
      Object.entries(entityData).forEach(([eid, e]) => {
        if (e.type === "experience" && e.places?.some((p) => placeAndChildren.has(p))) hl.add(eid);
      });
    }
  });
  selected.forEach((id) => hl.delete(id)); return hl;
}
const currencySymbols = { JPY: "¥", AUD: "$", USD: "$", EUR: "€", GBP: "£" };
function fmtAmount(amount, currency) { return `${currencySymbols[currency] || currency}${amount.toLocaleString()}`; }

const notesBlocks = [
  { id: "b1", content: ["We land at KIX around 2pm on the 15th. After getting the ", { id: "jr-pass" }, " at the airport, head straight to Kyoto Station. Should be at the ", { id: "ryokan" }, " by 4pm."] },
  { id: "b2", content: ["First stop: ", { id: "nishiki-tour" }, " — need to book before 3pm, slots fill up in spring. The pickle shops at the west end of ", { id: "nishiki" }, " are the best. Budget ", { id: "food-tour-cost" }, " for the tasting."] },
  { id: "b3", content: [{ id: "fushimi-hike" }, " needs a pre-dawn start — the upper trails past the main shrine at ", { id: "fushimi" }, " are nearly empty before 7am. Bring a headlamp. Grab ", { id: "fox-udon" }, " at the hilltop."] },
  { id: "b4", content: ["Afternoon: ", { id: "kiyomizu-walk" }, ". The walk down through Ninenzaka from ", { id: "kiyomizu" }, " is the highlight — traditional merchant streets."] },
  { id: "b5", content: ["Evening: ", { id: "sake-evening" }, " at Fushimi breweries — book in advance. This plus ", { id: "pottery-class" }, " are covered by the ", { id: "cultural-pkg" }, "."] },
  { id: "b6", content: [{ id: "bamboo" }, " at ", { id: "arashiyama" }, " — grove gets impossibly crowded after 10am. Earliest train ~8:40. Grab ", { id: "riverside-lunch" }, " at the river."] },
  { id: "b7", content: ["Day 4 is flexible — thinking ", { id: "osaka-day" }, "? Only 15 min Shinkansen to ", { id: "dotonbori" }, ". Or Philosopher's Path if cherry blossoms are early."] },
  { id: "b8", content: ["Still to figure out: ", { id: "tea-ceremony" }, " (Urasenke school?), buffer day, ", { id: "nara-trip" }, " as half-day side trip."] },
];
function blockMentions(b) { return b.content.filter((p) => typeof p !== "string").map((p) => p.id); }
function getAllMentionedIds() { const s = new Set(); notesBlocks.forEach((b) => blockMentions(b).forEach((id) => s.add(id))); return s; }

// ─── Calendar (for date range editing) ───
function MiniCalendar({ value, onSelect, onClose }) {
  const weeks = []; let day = 1 - new Date(2026, 2, 1).getDay();
  for (let w = 0; w < 6; w++) { const wk = []; for (let d = 0; d < 7; d++, day++) wk.push(day >= 1 && day <= 31 ? day : null); weeks.push(wk); if (day > 31) break; }
  const valDay = value ? parseInt(value.split("-")[2]) : null;
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: 12, width: 228, boxShadow: "0 12px 36px rgba(0,0,0,0.12)", zIndex: 60, fontSize: 11 }}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, textAlign: "center" }}>March 2026</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, textAlign: "center" }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <div key={d} style={{ fontSize: 8, fontWeight: 600, color: C.textDim, padding: "3px 0" }}>{d}</div>)}
        {weeks.flat().map((d, i) => d === null ? <div key={i}/> : (
          <div key={i} onClick={() => { onSelect(`2026-03-${String(d).padStart(2,"0")}`); onClose(); }}
            style={{ width: 28, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, cursor: "pointer", fontWeight: d === valDay ? 700 : 400, background: d === valDay ? C.blue : "transparent", color: d === valDay ? "#fff" : C.text, transition: "background 0.1s" }}
            onMouseEnter={(e) => { if (d !== valDay) e.currentTarget.style.background = C.surfaceAlt; }}
            onMouseLeave={(e) => { if (d !== valDay) e.currentTarget.style.background = "transparent"; }}>
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Currency picker ───
function CurrencyPicker({ value, onSelect, onClose }) {
  const currencies = ["JPY", "AUD", "USD", "EUR", "GBP"];
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: "4px 0", width: 120, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 60, fontSize: 12 }}>
      {currencies.map((c) => (
        <div key={c} onClick={() => { onSelect(c); onClose(); }}
          style={{ padding: "5px 12px", cursor: "pointer", fontWeight: c === value ? 700 : 400, color: c === value ? C.blue : C.text, display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <span style={{ width: 16, fontWeight: 700 }}>{currencySymbols[c]}</span>{c}
        </div>
      ))}
    </div>
  );
}

// ─── Timezone picker ───
function TimezonePicker({ onClose }) {
  const zones = ["Asia/Tokyo (UTC+09:00)", "Asia/Seoul (UTC+09:00)", "Asia/Shanghai (UTC+08:00)", "Australia/Melbourne (UTC+11:00)", "UTC"];
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: "4px 0", width: 240, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 60, fontSize: 12 }}>
      {zones.map((z) => (
        <div key={z} onClick={() => onClose()}
          style={{ padding: "6px 12px", cursor: "pointer", color: z.startsWith("Asia/Tokyo") ? C.blue : C.text, fontWeight: z.startsWith("Asia/Tokyo") ? 600 : 400 }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          {z}
        </div>
      ))}
    </div>
  );
}

// ─── Slash command popover ───
function SlashPopover({ query, onClose }) {
  const mentioned = getAllMentionedIds();
  const matching = Object.entries(entityData).filter(([id, e]) => e.parent && !["trip"].includes(id) && e.name.toLowerCase().includes(query.toLowerCase()));
  const unmentionedMatching = matching.filter(([id]) => !mentioned.has(id)).slice(0, 3);
  const mentionedMatching = matching.filter(([id]) => mentioned.has(id)).slice(0, 3);

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: "6px 0", width: 280, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, fontSize: 12 }}>
      {query.length > 0 && unmentionedMatching.length > 0 && (<>
        <div style={{ padding: "4px 12px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Not yet mentioned</div>
        {unmentionedMatching.map(([id, ent]) => (
          <div key={id} onClick={onClose} style={{ padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <span style={{ color: typeColor[ent.type], display: "flex" }}>{ent.type === "place" ? <PinIcon size={11} /> : <span style={{ fontSize: 11 }}>▸</span>}</span>
            <span style={{ color: C.text }}>{ent.name}</span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: typeColor[ent.type] }}>{ent.type}</span>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
      </>)}
      {query.length > 0 && mentionedMatching.length > 0 && (<>
        <div style={{ padding: "4px 12px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Already mentioned</div>
        {mentionedMatching.map(([id, ent]) => (
          <div key={id} onClick={onClose} style={{ padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: 0.6 }}
            onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <span style={{ color: typeColor[ent.type], display: "flex" }}>{ent.type === "place" ? <PinIcon size={11} /> : <span style={{ fontSize: 11 }}>▸</span>}</span>
            <span style={{ color: C.text }}>{ent.name}</span>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
      </>)}
      <div style={{ padding: "4px 12px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Create new{query ? ` "${query}"` : ""}</div>
      {[{ icon: <PinIcon size={11} />, label: "Place", type: "place" }, { icon: "▸", label: "Experience", type: "experience" }].map((t) => (
        <div key={t.type} onClick={onClose} style={{ padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <span style={{ color: typeColor[t.type], width: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.icon}</span>
          <span style={{ color: C.text }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Add ───
function InlineAddRow({ placeholder, depth = 0 }) {
  const [active, setActive] = useState(false); const [value, setValue] = useState("");
  if (!active) return (
    <div onClick={() => setActive(true)} style={{ padding: `4px 10px 4px ${16 + depth * 18}px`, fontSize: 12, color: C.textDim, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: 0.45, margin: "0 8px" }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"} onMouseLeave={(e) => e.currentTarget.style.opacity = "0.45"}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>+</span><span>{placeholder}</span>
    </div>
  );
  return (
    <div style={{ padding: `3px 10px 3px ${16 + depth * 18}px`, display: "flex", alignItems: "center", gap: 6, margin: "0 8px" }}>
      <span style={{ fontSize: 13, color: C.textDim }}>+</span>
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
        onBlur={() => { setActive(false); setValue(""); }}
        onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && value.trim())) { setActive(false); setValue(""); } }}
        placeholder={placeholder} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 12, color: C.text, outline: "none", flex: 1, fontFamily: "inherit" }} />
    </div>
  );
}

// ─── Notes ───
function NotesView({ selected, highlighted, onSelect, onNavigate }) {
  const [slashActive, setSlashActive] = useState(false);
  const [slashQuery, setSlashQuery] = useState("Nara");

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 80px" }}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.text }}>Kyoto trip planning</div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textDim, marginBottom: 20 }}>Last edited by Kai · 2 min ago</div>
        {notesBlocks.map((block) => {
          const mentions = blockMentions(block);
          const hasSel = mentions.some((m) => selected.has(m));
          const hasHL = mentions.some((m) => highlighted.has(m));
          return (
            <div key={block.id} style={{
              padding: "8px 12px", marginBottom: 2, borderRadius: 6,
              background: hasSel ? `${C.blue}12` : hasHL ? C.highlightBg : "transparent",
              borderLeft: hasSel ? `2px solid ${C.blue}60` : hasHL ? `2px solid ${C.highlightBorder}` : "2px solid transparent",
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 14, lineHeight: 1.85, color: C.textMuted, fontFamily: "'Georgia',serif" }}>
                {block.content.map((part, i) => {
                  if (typeof part === "string") return <span key={i}>{part}</span>;
                  const ent = entityData[part.id]; if (!ent) return null;
                  return (<Chip key={i} type={ent.type} selected={selected.has(part.id)} highlighted={highlighted.has(part.id)}
                    onClick={(e) => onSelect(part.id, e)}
                    scheduled={!!ent.schedDate} amount={ent.amount} placeName={getPlaceName(ent)}
                    onClockClick={(e) => { onSelect(part.id, e); onNavigate("schedule"); }}
                    onExpenseClick={(e) => { onSelect(part.id, e); onNavigate("expenses"); }}
                    onPlaceIconClick={(e) => { onSelect(part.id, e); onNavigate("map"); }}
                  >{ent.name}</Chip>);
                })}
              </div>
            </div>
          );
        })}

        {/* Slash command demo */}
        <div style={{ position: "relative", padding: "8px 12px", marginBottom: 2 }}>
          <div style={{ fontSize: 14, lineHeight: 1.85, color: C.textMuted, fontFamily: "'Georgia',serif" }}>
            Maybe a half-day side trip to{" "}
            <span style={{ position: "relative", cursor: "text" }} onClick={() => setSlashActive(!slashActive)}>
              <span style={{ color: C.textDim }}>/</span>
              <span style={{ color: C.text, borderBottom: `1px solid ${C.textDim}` }}>{slashQuery}</span>
              <span style={{ display: "inline-block", width: 2, height: 16, background: C.accent, marginLeft: 1, verticalAlign: "text-bottom", animation: "blink 1s infinite" }} />
              {slashActive && (
                <span style={{ position: "absolute", left: 0, bottom: 24, zIndex: 50 }}>
                  <SlashPopover query={slashQuery} onClose={() => setSlashActive(false)} />
                </span>
              )}
            </span>
            {" "}for the deer park?
          </div>
        </div>

        <div style={{ padding: "10px 12px", margin: "4px 0", borderRadius: 6, cursor: "text" }}>
          <div style={{ fontSize: 14, color: C.textDim, fontFamily: "'Georgia',serif" }}>
            Type to continue... <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, background: C.surfaceAlt, padding: "1px 5px", borderRadius: 3, border: `1px solid ${C.border}` }}>/</span> to mention
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 12, marginTop: 8 }}>
          <div style={{ width: 2, height: 18, background: "#4a8a5a", borderRadius: 1, animation: "blink 1.2s infinite" }} />
          <span style={{ fontSize: 9, background: "#4a8a5a", color: "#fff", padding: "1px 5px", borderRadius: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Mika</span>
        </div>
        <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    </div>
  );
}

// ─── Places ───
function PlacesView({ selected, highlighted, onSelect }) {
  const roots = Object.entries(entityData).filter(([, e]) => e.type === "place" && !e.parent);
  const childrenOf = (pid) => Object.entries(entityData).filter(([, e]) => e.type === "place" && e.parent === pid);
  const Node = ({ id, ent, depth }) => {
    const [open, setOpen] = useState(true);
    const children = childrenOf(id); const hasKids = children.length > 0;
    const isSel = selected.has(id); const isHl = highlighted.has(id);
    const unlocated = !ent.coords && !hasKids;
    return (<>
      <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", id)} onDragOver={(e) => e.preventDefault()} style={{ paddingLeft: depth * 18 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {hasKids && <span onClick={() => setOpen(!open)} style={{ width: 18, fontSize: 8, color: C.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.12s", marginLeft: 8 }}>▶</span>}
          <div onClick={(e) => onSelect(id, e)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", margin: "1px 8px", marginLeft: hasKids ? 8 : 26, borderRadius: 6, cursor: "pointer", flex: 1,
            background: isSel ? C.accent : isHl ? C.highlightPlaceBg : "transparent",
            border: isSel ? `1.5px solid ${C.accent}` : isHl ? `1px solid ${C.highlightPlaceBorder}` : "1px solid transparent",
            transition: "all 0.12s", fontSize: 12,
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", opacity: isSel ? 0.9 : unlocated ? 0.35 : 0.6 }}><PinIcon size={11} color={isSel ? "#fff" : C.accent} /></span>
            <span style={{ color: isSel ? "#fff" : unlocated ? C.textDim : C.text, fontWeight: hasKids ? 600 : 400, flex: 1 }}>{ent.name}</span>
            {unlocated && !isSel && <span style={{ fontSize: 9, color: C.textDim, fontStyle: "italic" }}>no loc</span>}
          </div>
        </div>
      </div>
      {open && children.map(([cid, cent]) => <Node key={cid} id={cid} ent={cent} depth={depth + 1} />)}
      {open && hasKids && <div style={{ paddingLeft: (depth + 1) * 18 }}><InlineAddRow placeholder="Add place..." depth={0} /></div>}
    </>);
  };
  return (<div style={{ overflow: "auto", height: "100%", paddingTop: 4, paddingBottom: 16 }}>{roots.map(([id, ent]) => <Node key={id} id={id} ent={ent} depth={0} />)}<InlineAddRow placeholder="Add place..." depth={0} /></div>);
}

// ─── Experiences ───
function ExperiencesView({ selected, highlighted, onSelect }) {
  const roots = Object.entries(entityData).filter(([, e]) => e.type === "experience" && !e.parent);
  const childrenOf = (pid) => Object.entries(entityData).filter(([, e]) => e.type === "experience" && e.parent === pid);
  const Node = ({ id, ent, depth }) => {
    const [open, setOpen] = useState(depth < 2);
    const children = childrenOf(id); const hasKids = children.length > 0;
    const isSel = selected.has(id); const isHl = highlighted.has(id);
    const places = (ent.places || []).map((p) => entityData[p]).filter(Boolean);
    const cost = subtreeCost(id);
    return (<>
      <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", id)} onDragOver={(e) => e.preventDefault()} style={{ paddingLeft: depth * 18 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {hasKids && <span onClick={() => setOpen(!open)} style={{ width: 18, fontSize: 8, color: C.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.12s", marginLeft: 8 }}>▶</span>}
          <div onClick={(e) => onSelect(id, e)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", margin: "1px 8px", marginLeft: hasKids ? 8 : 26, borderRadius: 6, cursor: "pointer", flex: 1,
            background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
            border: isSel ? `1.5px solid ${C.blue}` : isHl ? `1px solid ${C.highlightBorder}` : "1px solid transparent",
            transition: "all 0.12s", fontSize: 12,
          }}>
            <span style={{ width: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {ent.amount != null ? <span style={{ fontSize: 9, color: isSel ? "rgba(255,255,255,0.8)" : C.blueText, fontWeight: 700 }}>¥</span> : <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "rgba(255,255,255,0.6)" : C.blue, opacity: isSel ? 1 : 0.5 }} />}
            </span>
            <span style={{ fontWeight: hasKids ? 600 : 400, flex: 1, color: isSel ? "#fff" : C.text }}>{ent.name}</span>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
              {places.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9, color: isSel ? "rgba(255,255,255,0.7)" : C.accent }}><PinIcon size={9} color={isSel ? "rgba(255,255,255,0.7)" : C.accent} />{places[0].name}</span>}
              {ent.schedDate && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9, color: isSel ? "rgba(255,255,255,0.6)" : C.textMuted }}><ClockIcon size={8} color={isSel ? "rgba(255,255,255,0.6)" : C.textMuted} />{fmtDate(ent.schedDate)}</span>}
              {cost > 0 && <span style={{ fontSize: 9, color: isSel ? "rgba(255,255,255,0.7)" : C.blueText, opacity: isSel ? 1 : 0.6, fontVariantNumeric: "tabular-nums" }}>{fmtAmount(cost, ent.currency || "JPY")}</span>}
            </div>
          </div>
        </div>
      </div>
      {open && children.map(([cid, cent]) => <Node key={cid} id={cid} ent={cent} depth={depth + 1} />)}
      {open && hasKids && <div style={{ paddingLeft: (depth + 1) * 18 }}><InlineAddRow placeholder="Add experience..." depth={0} /></div>}
    </>);
  };
  return (<div style={{ overflow: "auto", height: "100%", paddingTop: 4, paddingBottom: 16 }}>{roots.map(([id, ent]) => <Node key={id} id={id} ent={ent} depth={0} />)}<InlineAddRow placeholder="Add experience..." depth={0} /></div>);
}

// ─── Map ───
function MapView({ selected, highlighted, onSelect }) {
  const pins = [{ id: "fushimi", x: 72, y: 20 }, { id: "arashiyama", x: 16, y: 16 }, { id: "nishiki", x: 44, y: 42 }, { id: "kiyomizu", x: 58, y: 52 }, { id: "dotonbori", x: 85, y: 82 }];
  return (
    <div style={{ width: "100%", height: "100%", background: "#eae8e2", position: "relative", overflow: "hidden" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} viewBox="0 0 600 500" preserveAspectRatio="none">
        {[50,110,170,230,290,350,410,470].map((y, i) => <path key={i} d={`M 0 ${y+Math.sin(i*0.7)*20} Q 200 ${y-12+i*3} 400 ${y+10} Q 500 ${y+15} 600 ${y-8}`} fill="none" stroke="#000" strokeWidth="1" />)}
      </svg>
      {pins.map((pin) => {
        const ent = entityData[pin.id]; const isSel = selected.has(pin.id); const isHl = highlighted.has(pin.id); const lit = isSel||isHl;
        return (
          <div key={pin.id} onClick={(e) => onSelect(pin.id, e)} style={{ position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%,-100%)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", zIndex: lit?10:1 }}>
            <div style={{ background: isSel?C.accent:isHl?"#e8d4cc":C.surface, color: isSel?"#fff":C.text, fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap", marginBottom: 3, border: isHl&&!isSel?`1.5px solid ${C.accent}60`:"none", boxShadow: isSel?`0 2px 10px ${C.accent}50`:"0 1px 4px rgba(0,0,0,0.12)", transition: "all 0.15s" }}>{ent?.name}</div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isSel?C.accent:isHl?C.accent:C.surface, border: `2px solid ${isSel?C.surface:C.accent}`, opacity: isHl&&!isSel?0.6:1, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(10px)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: C.textDim, marginBottom: 4 }}>Unlocated</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Object.entries(entityData).filter(([,e]) => e.type==="place"&&!e.coords&&e.parent).map(([id,e]) => (
            <Chip key={id} type="place" small selected={selected.has(id)} highlighted={highlighted.has(id)} onClick={(ev) => onSelect(id, ev)} onPlaceIconClick={(ev) => onSelect(id, ev)}>{e.name}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Schedule ───
function ScheduleView({ selected, highlighted, onSelect, onSetSelected }) {
  const [editingTime, setEditingTime] = useState(null);
  const [timeValue, setTimeValue] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState("2026-03-15");
  const [dateRangeEnd, setDateRangeEnd] = useState("2026-03-19");
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [dragOverDate, setDragOverDate] = useState(null);

  // Generate dates in range
  const dates = [];
  const start = new Date(dateRangeStart + "T00:00:00");
  const end = new Date(dateRangeEnd + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }

  const unscheduled = getUnscheduledExps();

  return (
    <div style={{ overflow: "auto", height: "100%", padding: "8px 0", position: "relative" }}>
      {/* Date range header */}
      <div style={{ padding: "6px 16px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.textDim }}>Schedule:</span>
        <span style={{ position: "relative" }}>
          <span onClick={() => { setEditingStart(!editingStart); setEditingEnd(false); }}
            style={{ fontSize: 12, fontWeight: 600, color: C.blue, cursor: "pointer", padding: "2px 6px", borderRadius: 4, border: `1px solid ${editingStart ? C.blue : "transparent"}`, transition: "all 0.1s" }}
            onMouseEnter={(e) => { if (!editingStart) e.currentTarget.style.background = C.surfaceAlt; }}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            {fmtDate(dateRangeStart)}
          </span>
          {editingStart && <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 60 }}><MiniCalendar value={dateRangeStart} onSelect={setDateRangeStart} onClose={() => setEditingStart(false)} /></div>}
        </span>
        <span style={{ color: C.textDim }}>—</span>
        <span style={{ position: "relative" }}>
          <span onClick={() => { setEditingEnd(!editingEnd); setEditingStart(false); }}
            style={{ fontSize: 12, fontWeight: 600, color: C.blue, cursor: "pointer", padding: "2px 6px", borderRadius: 4, border: `1px solid ${editingEnd ? C.blue : "transparent"}`, transition: "all 0.1s" }}
            onMouseEnter={(e) => { if (!editingEnd) e.currentTarget.style.background = C.surfaceAlt; }}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            {fmtDate(dateRangeEnd)}
          </span>
          {editingEnd && <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 60 }}><MiniCalendar value={dateRangeEnd} onSelect={setDateRangeEnd} onClose={() => setEditingEnd(false)} /></div>}
        </span>
      </div>

      {dates.map((date, di) => {
        const exps = getExpsForDate(date);
        const isDragOver = dragOverDate === date;
        return (
          <div key={date}
            onDragOver={(e) => { e.preventDefault(); setDragOverDate(date); }}
            onDragLeave={() => setDragOverDate(null)}
            onDrop={(e) => { e.preventDefault(); setDragOverDate(null); /* would update schedDate */ }}
            style={{ marginBottom: 2, background: isDragOver ? C.highlightBg : "transparent", borderRadius: 6, margin: "0 4px", transition: "background 0.1s" }}>
            <div onClick={(e) => {
              const ids = exps.map((exp) => exp.id); if (ids.length === 0) return;
              if (e.ctrlKey || e.metaKey) { onSetSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.add(id)); return n; }); }
              else { onSetSelected(() => new Set(ids)); }
            }} style={{ padding: "8px 12px 4px", display: "flex", alignItems: "baseline", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmtDate(date)}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>{fmtDay(date)}</span>
            </div>

            {/* Timezone on first day */}
            {di === 0 && (
              <div style={{ padding: "2px 12px 6px 20px", position: "relative" }}>
                <span onClick={() => setShowTzPicker(!showTzPicker)}
                  style={{ fontSize: 10, color: C.textDim, cursor: "pointer", padding: "2px 6px", borderRadius: 3, transition: "all 0.1s", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textDim; }}>
                  🌐 Asia/Tokyo (UTC+09:00)
                </span>
                {showTzPicker && <div style={{ position: "absolute", left: 20, top: "100%", marginTop: 2, zIndex: 60 }}><TimezonePicker onClose={() => setShowTzPicker(false)} /></div>}
              </div>
            )}

            {exps.map((exp) => {
              const isSel = selected.has(exp.id); const isHl = highlighted.has(exp.id);
              const places = (exp.places || []).map((pid) => entityData[pid]).filter(Boolean);
              const cost = subtreeCost(exp.id);
              const isEditingTime = editingTime === exp.id;
              return (
                <div key={exp.id}
                  draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", exp.id)}
                  onClick={(e) => onSelect(exp.id, e)} style={{
                  padding: "6px 12px 6px 16px", cursor: "grab",
                  background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
                  border: isSel ? `1.5px solid ${C.blue}` : isHl ? `1px solid ${C.highlightBorder}` : "1px solid transparent",
                  borderRadius: 6, margin: "1px 4px", display: "flex", alignItems: "center", gap: 8, transition: "all 0.12s",
                }}>
                  {/* Editable time */}
                  {isEditingTime ? (
                    <input autoFocus value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      onBlur={() => setEditingTime(null)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingTime(null); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 64, fontSize: 11, color: C.text, background: C.surfaceAlt, border: `1px solid ${C.blue}`, borderRadius: 4, padding: "2px 4px", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }} />
                  ) : (
                    <span onClick={(e) => { e.stopPropagation(); setEditingTime(exp.id); setTimeValue(exp.schedTime || ""); }}
                      style={{ fontSize: 11, color: isSel ? "rgba(255,255,255,0.7)" : C.textMuted, width: 64, flexShrink: 0, fontVariantNumeric: "tabular-nums", cursor: "text", borderRadius: 4, padding: "3px 4px", margin: "-3px -4px", display: "inline-flex", alignItems: "center", gap: 4, transition: "all 0.1s" }}
                      onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = C.text; } }}
                      onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; } }}>
                      <ClockIcon size={9} color={isSel ? "rgba(255,255,255,0.7)" : "currentColor"} />{exp.schedTime || "—"}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: isSel ? "#fff" : C.text }}>{exp.name}</div>
                    {places.length > 0 && <div style={{ fontSize: 10, color: isSel ? "rgba(255,255,255,0.7)" : C.accent, marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}><PinIcon size={8} color={isSel ? "rgba(255,255,255,0.7)" : C.accent} />{places[0].name}</div>}
                  </div>
                  {cost > 0 && <span style={{ fontSize: 10, color: isSel ? "rgba(255,255,255,0.6)" : C.blueText, opacity: isSel ? 1 : 0.6, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>¥{cost.toLocaleString()}</span>}
                </div>
              );
            })}
            <div style={{ padding: "4px 12px 4px 24px", fontSize: 11, color: C.textDim, cursor: "pointer", opacity: 0.4 }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"} onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}>
              + Add or link experience...
            </div>
            <div style={{ height: 1, background: C.border, margin: "4px 12px" }} />
          </div>
        );
      })}

      {unscheduled.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ padding: "8px 16px 4px", fontSize: 12, fontWeight: 700, color: C.textDim }}>Unscheduled</div>
          {unscheduled.map((exp) => {
            const isSel = selected.has(exp.id);
            return (
              <div key={exp.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", exp.id)}
                onClick={(e) => onSelect(exp.id, e)} style={{
                padding: "6px 12px 6px 16px", cursor: "grab",
                background: isSel ? C.blue : "transparent",
                border: isSel ? `1.5px solid ${C.blue}` : "1px solid transparent",
                borderRadius: 6, margin: "1px 4px", display: "flex", alignItems: "center", gap: 8, opacity: isSel ? 1 : 0.65,
              }}>
                <span style={{ fontSize: 11, color: isSel ? "rgba(255,255,255,0.7)" : C.textDim, width: 64, fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <ClockIcon size={9} color={isSel ? "rgba(255,255,255,0.7)" : C.textDim} />drag to schedule
                </span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 500, color: isSel ? "#fff" : C.text }}>{exp.name}</div></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Expenses ───
function ExpensesView({ selected, highlighted, onSelect }) {
  const [editingAmount, setEditingAmount] = useState(null);
  const [amountValue, setAmountValue] = useState("");
  const [showCurrencyFor, setShowCurrencyFor] = useState(null);

  const expenses = Object.entries(entityData).filter(([, e]) => e.type === "experience" && e.amount != null).map(([id, e]) => ({ id, ...e }));

  // Group by currency
  const byCurrency = {};
  expenses.forEach((e) => { const c = e.currency || "JPY"; byCurrency[c] = (byCurrency[c] || 0) + e.amount; });

  // Highlighted + selected subtotal
  const activeIds = new Set([...selected, ...highlighted]);
  const activeByCurrency = {};
  expenses.forEach((e) => { if (activeIds.has(e.id)) { const c = e.currency || "JPY"; activeByCurrency[c] = (activeByCurrency[c] || 0) + e.amount; } });
  const hasActiveSubtotal = Object.keys(activeByCurrency).length > 0;

  const totalStr = Object.entries(byCurrency).map(([c, a]) => fmtAmount(a, c)).join(" + ");
  const activeStr = Object.entries(activeByCurrency).map(([c, a]) => fmtAmount(a, c)).join(" + ");

  return (
    <div style={{ overflow: "auto", height: "100%", padding: "10px 0", fontSize: 12 }}>
      {expenses.map(({ id, name, amount, parent, currency }) => {
        const isSel = selected.has(id); const isHl = highlighted.has(id);
        const parentEnt = parent ? entityData[parent] : null;
        const isEditing = editingAmount === id;
        const cur = currency || "JPY";
        return (
          <div key={id} style={{ position: "relative" }}>
            <div onClick={(e) => onSelect(id, e)} style={{
              padding: "8px 14px", cursor: "pointer", margin: "1px 8px",
              background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
              border: isSel ? `1.5px solid ${C.blue}` : isHl ? `1px solid ${C.highlightBorder}` : "1px solid transparent",
              borderRadius: 6, display: "flex", alignItems: "center", gap: 8, transition: "all 0.12s",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: isSel ? "#fff" : C.text }}>{name}</div>
                {parentEnt && <div style={{ fontSize: 10, color: isSel ? "rgba(255,255,255,0.6)" : C.blueText, marginTop: 2, opacity: isSel ? 1 : 0.7 }}>in {parentEnt.name}</div>}
              </div>
              {isEditing ? (
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <span onClick={(e) => { e.stopPropagation(); setShowCurrencyFor(showCurrencyFor === id ? null : id); }}
                    style={{ fontSize: 12, fontWeight: 700, color: C.blue, cursor: "pointer", padding: "2px 4px", borderRadius: 3, transition: "background 0.1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    {currencySymbols[cur]}
                  </span>
                  <input autoFocus value={amountValue} onChange={(e) => setAmountValue(e.target.value)}
                    onBlur={() => setEditingAmount(null)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingAmount(null); }}
                    style={{ width: 72, fontSize: 12, fontWeight: 600, color: C.text, background: C.surfaceAlt, border: `1px solid ${C.blue}`, borderRadius: 4, padding: "2px 6px", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", textAlign: "right" }} />
                </div>
              ) : (
                <span onClick={(e) => { e.stopPropagation(); setEditingAmount(id); setAmountValue(String(amount)); }}
                  style={{ fontVariantNumeric: "tabular-nums", color: isSel ? "rgba(255,255,255,0.85)" : C.textMuted, flexShrink: 0, fontWeight: 600, cursor: "text", padding: "2px 6px", borderRadius: 4, transition: "all 0.1s" }}
                  onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = C.text; } }}
                  onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; } }}>
                  {fmtAmount(amount, cur)}
                </span>
              )}
            </div>
            {showCurrencyFor === id && (
              <div style={{ position: "absolute", right: 8, top: "100%", marginTop: 2, zIndex: 60 }}>
                <CurrencyPicker value={cur} onSelect={() => {}} onClose={() => setShowCurrencyFor(null)} />
              </div>
            )}
          </div>
        );
      })}
      <InlineAddRow placeholder="Add expense..." depth={0} />

      {/* Subtotals */}
      <div style={{ margin: "12px 16px 0", padding: 0 }}>
        {hasActiveSubtotal && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.blueText }}>
            <span style={{ fontWeight: 500 }}>Highlighted</span>
            <span style={{ fontWeight: 600 }}>{activeStr}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${C.borderStrong}`, fontWeight: 700, fontSize: 13 }}>
          <span>Total</span><span>{totalStr}</span>
        </div>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, height: 36, background: C.bg, flexShrink: 0, paddingLeft: 4 }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onSelect(tab.id)} style={{
          background: "none", border: "none", padding: "0 14px", height: "100%",
          fontSize: 12, fontWeight: active === tab.id ? 600 : 400,
          color: active === tab.id ? C.text : C.textDim,
          borderBottom: active === tab.id ? `2px solid ${C.blue}` : "2px solid transparent",
          cursor: "pointer", fontFamily: "inherit",
        }}>{tab.label}</button>
      ))}
    </div>
  );
}

function SelectionPopover({ selected, onSelect, onNavigate, onClearAll }) {
  const ids = [...selected]; if (ids.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 10, left: "50%", transform: "translateX(-50%)",
      background: C.surface, border: `1px solid ${C.borderStrong}`,
      borderRadius: 10, padding: "7px 10px", maxWidth: 600, zIndex: 100,
      boxShadow: "0 4px 24px rgba(0,0,0,0.1)", fontSize: 12,
      display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap",
    }}>
      {ids.slice(0, 8).map((id) => {
        const ent = entityData[id]; if (!ent) return null;
        return (<Chip key={id} type={ent.type} selected={true}
          onClick={() => onSelect(id, { ctrlKey: true, metaKey: true })}
          scheduled={!!ent.schedDate} amount={ent.amount} placeName={getPlaceName(ent)}
          onClockClick={() => onNavigate("schedule")}
          onExpenseClick={() => onNavigate("expenses")}
          onPlaceIconClick={() => onNavigate("map")}
        >{ent.name}</Chip>);
      })}
      {ids.length > 8 && <span style={{ color: C.textDim, fontSize: 11 }}>+{ids.length - 8} more</span>}
      <span onClick={onClearAll}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", cursor: "pointer", color: C.textDim, fontSize: 14, lineHeight: 1, flexShrink: 0, marginLeft: 2, transition: "all 0.1s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = C.text; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textDim; }}
        title="Clear selection">×</span>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(new Set());
  const [leftTab, setLeftTab] = useState("map");
  const [rightTab, setRightTab] = useState("notes");

  const handleSelect = useCallback((id, e) => {
    const additive = e?.ctrlKey || e?.metaKey;
    setSelected((prev) => {
      if (additive) { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }
      else { if (prev.size === 1 && prev.has(id)) return new Set(); return new Set([id]); }
    });
  }, []);

  const handleNavigate = useCallback((tab) => {
    if (["map", "schedule", "expenses"].includes(tab)) setLeftTab(tab);
    else setRightTab(tab);
  }, []);

  const highlighted = computeHighlighted(selected);

  return (
    <div style={{ height: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ height: 42, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0, background: C.surface }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Kyoto · March 2026</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex" }}>
          {[{ color: "#d06840", label: "K" }, { color: "#4a8a5a", label: "M" }].map((c, i) => (
            <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", marginLeft: i > 0 ? -4 : 0, border: `2px solid ${C.surface}` }}>{c.label}</div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}`, minWidth: 0 }}>
          <TabBar tabs={[{ id: "map", label: "Map" }, { id: "schedule", label: "Schedule" }, { id: "expenses", label: "Expenses" }]} active={leftTab} onSelect={setLeftTab} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {leftTab === "map" && <MapView selected={selected} highlighted={highlighted} onSelect={handleSelect} />}
            {leftTab === "schedule" && <ScheduleView selected={selected} highlighted={highlighted} onSelect={handleSelect} onSetSelected={setSelected} />}
            {leftTab === "expenses" && <ExpensesView selected={selected} highlighted={highlighted} onSelect={handleSelect} />}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TabBar tabs={[{ id: "notes", label: "Notes" }, { id: "places", label: "Places" }, { id: "experiences", label: "Experiences" }]} active={rightTab} onSelect={setRightTab} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {rightTab === "notes" && <NotesView selected={selected} highlighted={highlighted} onSelect={handleSelect} onNavigate={handleNavigate} />}
            {rightTab === "places" && <PlacesView selected={selected} highlighted={highlighted} onSelect={handleSelect} />}
            {rightTab === "experiences" && <ExperiencesView selected={selected} highlighted={highlighted} onSelect={handleSelect} />}
          </div>
        </div>
      </div>
      <SelectionPopover selected={selected} onSelect={handleSelect} onNavigate={handleNavigate} onClearAll={() => setSelected(new Set())} />
    </div>
  );
}
