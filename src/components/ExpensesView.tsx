/**
 * ExpensesView — filtered list of experiences with non-null amounts.
 *
 * Features:
 * - Flat list of expenses (experiences where amount != null)
 * - Each row: name, "in {parentName}", amount
 * - Inline amount editing (click amount -> text input -> blur/enter commits)
 * - Currency picker dropdown when clicking currency symbol during editing
 * - Multi-currency totals
 * - "Highlighted" subtotal for selected + highlighted expenses
 * - Selection/highlighting with inverted/tinted treatment
 * - "+ Add expense..." inline add row
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted, aggregateCosts } from "../entities/helpers";
import {
  Experience,
  EntityId,
  Currency,
  CURRENCY_SYMBOLS,
  isExperience,
} from "../entities/types";

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
  blue: "#2d5f82",
  blueText: "#1e4a6a",
  highlightBg: "rgba(45,95,130,0.08)",
  highlightBorder: "rgba(45,95,130,0.28)",
};

const CURRENCIES: Currency[] = ["JPY", "AUD", "USD", "EUR", "GBP"];

// ─── Helpers ───

function fmtAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${amount.toLocaleString()}`;
}

// ─── Currency Picker ───

function CurrencyPicker({
  value,
  onSelect,
  onClose,
}: {
  value: Currency;
  onSelect: (c: Currency) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-currency-picker
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // Prevent blur on the input when clicking within the picker
        e.preventDefault();
      }}
      style={{
        background: C.surface,
        border: `1px solid ${C.borderStrong}`,
        borderRadius: 8,
        padding: "4px 0",
        width: 120,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 60,
        fontSize: 12,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {CURRENCIES.map((c) => (
        <div
          key={c}
          data-currency-option={c}
          onClick={() => {
            onSelect(c);
            onClose();
          }}
          style={{
            padding: "5px 12px",
            cursor: "pointer",
            fontWeight: c === value ? 700 : 400,
            color: c === value ? C.blue : C.text,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = C.surfaceAlt)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span style={{ width: 16, fontWeight: 700 }}>
            {CURRENCY_SYMBOLS[c]}
          </span>
          {c}
        </div>
      ))}
    </div>
  );
}

// ─── Inline Add Row ───

function InlineAddRow({
  onAdd,
}: {
  onAdd: (name: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onAdd(value.trim());
    }
    setActive(false);
    setValue("");
  }, [value, onAdd]);

  if (!active) {
    return (
      <div
        data-expense-add
        onClick={() => setActive(true)}
        style={{
          padding: "4px 14px",
          fontSize: 12,
          color: C.textDim,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          opacity: 0.45,
          margin: "0 8px",
          transition: "opacity 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
        <span>Add expense...</span>
      </div>
    );
  }

  return (
    <div
      data-expense-add-input
      style={{
        padding: "3px 14px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        margin: "0 8px",
      }}
    >
      <span style={{ fontSize: 13, color: C.textDim }}>+</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setActive(false);
            setValue("");
          } else if (e.key === "Enter") {
            handleSubmit();
          }
        }}
        placeholder="Add expense..."
        style={{
          background: C.surfaceAlt,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 12,
          color: C.text,
          outline: "none",
          flex: 1,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ─── Expense Row ───

function ExpenseRow({
  expense,
  parentName,
  isSelected,
  isHighlighted,
  onSelect,
  onUpdateAmount,
  onUpdateCurrency,
  onRemoveAmount,
}: {
  expense: Experience;
  parentName: string | null;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (id: EntityId, e: React.MouseEvent) => void;
  onUpdateAmount: (id: EntityId, amount: number) => void;
  onUpdateCurrency: (id: EntityId, currency: Currency) => void;
  onRemoveAmount: (id: EntityId) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [amountValue, setAmountValue] = useState("");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editingContainerRef = useRef<HTMLDivElement>(null);
  const originalAmount = useRef<number>(0);

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      originalAmount.current = expense.amount ?? 0;
      setAmountValue(String(expense.amount ?? 0));
      setIsEditing(true);
    },
    [expense.amount]
  );

  const commitEdit = useCallback(() => {
    const trimmed = amountValue.trim();
    // If empty or zero, remove the amount
    if (trimmed === "" || trimmed === "0") {
      onRemoveAmount(expense.id);
      setIsEditing(false);
      setShowCurrencyPicker(false);
      return;
    }
    const parsed = parseFloat(amountValue);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateAmount(expense.id, parsed);
    }
    setIsEditing(false);
    setShowCurrencyPicker(false);
  }, [amountValue, expense.id, onUpdateAmount, onRemoveAmount]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setAmountValue(String(originalAmount.current));
    setShowCurrencyPicker(false);
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Don't commit if focus is moving to the currency trigger or picker
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget && editingContainerRef.current?.contains(relatedTarget)) {
        return;
      }
      commitEdit();
    },
    [commitEdit]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const isSel = isSelected;
  const isHl = isHighlighted && !isSelected;

  return (
    <div key={expense.id} style={{ position: "relative" }}>
      <div
        data-expense-row={expense.id}
        data-entity-id={expense.id}
        data-selected={isSel ? "true" : undefined}
        data-highlighted={isHl ? "true" : undefined}
        onClick={(e) => onSelect(expense.id, e)}
        style={{
          padding: "8px 14px",
          cursor: "pointer",
          margin: "1px 8px",
          background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
          border: isSel
            ? `1.5px solid ${C.blue}`
            : isHl
              ? `1px solid ${C.highlightBorder}`
              : "1px solid transparent",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.12s",
          fontFamily:
            "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Name and parent */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            data-expense-name={expense.id}
            style={{
              fontWeight: 500,
              fontSize: 12,
              color: isSel ? "#fff" : C.text,
            }}
          >
            {expense.name}
          </div>
          {parentName && (
            <div
              data-expense-parent={expense.id}
              style={{
                fontSize: 10,
                color: isSel ? "rgba(255,255,255,0.6)" : C.blueText,
                marginTop: 2,
                opacity: isSel ? 1 : 0.7,
              }}
            >
              in {parentName}
            </div>
          )}
        </div>

        {/* Amount (editable) */}
        {isEditing ? (
          <div
            ref={editingContainerRef}
            data-expense-editing={expense.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-currency-trigger={expense.id}
              tabIndex={0}
              onMouseDown={(e) => {
                // Prevent blur on the input when clicking currency trigger
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowCurrencyPicker(!showCurrencyPicker);
              }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.blue,
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 3,
                transition: "background 0.1s",
                background: "transparent",
                border: "none",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = C.surfaceAlt)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {CURRENCY_SYMBOLS[expense.currency]}
            </button>
            <input
              ref={inputRef}
              data-amount-input={expense.id}
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitEdit();
                } else if (e.key === "Escape") {
                  cancelEdit();
                }
              }}
              style={{
                width: 72,
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
                background: C.surfaceAlt,
                border: `1px solid ${C.blue}`,
                borderRadius: 4,
                padding: "2px 6px",
                outline: "none",
                fontFamily: "inherit",
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
              }}
            />
          </div>
        ) : (
          <span
            data-expense-amount={expense.id}
            onClick={startEditing}
            style={{
              fontVariantNumeric: "tabular-nums",
              color: isSel ? "rgba(255,255,255,0.85)" : C.textMuted,
              flexShrink: 0,
              fontWeight: 600,
              fontSize: 12,
              cursor: "text",
              padding: "2px 6px",
              borderRadius: 4,
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
            {fmtAmount(expense.amount!, expense.currency)}
          </span>
        )}
      </div>

      {/* Currency picker dropdown */}
      {showCurrencyPicker && (
        <div
          style={{
            position: "absolute",
            right: 8,
            top: "100%",
            marginTop: 2,
            zIndex: 60,
          }}
        >
          <CurrencyPicker
            value={expense.currency}
            onSelect={(c) => onUpdateCurrency(expense.id, c)}
            onClose={() => setShowCurrencyPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Non-Expense Row ───

function NonExpenseRow({
  experience,
  parentName,
  isSelected,
  isHighlighted,
  onSelect,
  onAddAmount,
}: {
  experience: Experience;
  parentName: string | null;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (id: EntityId, e: React.MouseEvent) => void;
  onAddAmount: (id: EntityId, amount: number, currency: Currency) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [amountValue, setAmountValue] = useState("");
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editingContainerRef = useRef<HTMLDivElement>(null);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAmountValue("");
    setIsEditing(true);
  }, []);

  const commitEdit = useCallback(() => {
    const trimmed = amountValue.trim();
    if (trimmed === "" || trimmed === "0") {
      setIsEditing(false);
      setShowCurrencyPicker(false);
      return;
    }
    const parsed = parseFloat(amountValue);
    if (!isNaN(parsed) && parsed > 0) {
      onAddAmount(experience.id, parsed, currency);
    }
    setIsEditing(false);
    setShowCurrencyPicker(false);
  }, [amountValue, experience.id, currency, onAddAmount]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setAmountValue("");
    setShowCurrencyPicker(false);
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget && editingContainerRef.current?.contains(relatedTarget)) {
        return;
      }
      commitEdit();
    },
    [commitEdit]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const isSel = isSelected;
  const isHl = isHighlighted && !isSelected;

  return (
    <div key={experience.id} style={{ position: "relative" }}>
      <div
        data-non-expense-row={experience.id}
        data-entity-id={experience.id}
        data-selected={isSel ? "true" : undefined}
        data-highlighted={isHl ? "true" : undefined}
        onClick={(e) => onSelect(experience.id, e)}
        style={{
          padding: "8px 14px",
          cursor: "pointer",
          margin: "1px 8px",
          background: isSel ? C.blue : isHl ? C.highlightBg : "transparent",
          border: isSel
            ? `1.5px solid ${C.blue}`
            : isHl
              ? `1px solid ${C.highlightBorder}`
              : "1px solid transparent",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.12s",
          fontFamily:
            "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Name and parent */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            data-non-expense-name={experience.id}
            style={{
              fontWeight: 500,
              fontSize: 12,
              color: isSel ? "#fff" : C.text,
            }}
          >
            {experience.name}
          </div>
          {parentName && (
            <div
              data-non-expense-parent={experience.id}
              style={{
                fontSize: 10,
                color: isSel ? "rgba(255,255,255,0.6)" : C.blueText,
                marginTop: 2,
                opacity: isSel ? 1 : 0.7,
              }}
            >
              in {parentName}
            </div>
          )}
        </div>

        {/* Amount (add mode) */}
        {isEditing ? (
          <div
            ref={editingContainerRef}
            data-non-expense-editing={experience.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-currency-trigger={experience.id}
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setShowCurrencyPicker(!showCurrencyPicker);
              }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.blue,
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 3,
                transition: "background 0.1s",
                background: "transparent",
                border: "none",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = C.surfaceAlt)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {CURRENCY_SYMBOLS[currency]}
            </button>
            <input
              ref={inputRef}
              data-amount-input={experience.id}
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitEdit();
                } else if (e.key === "Escape") {
                  cancelEdit();
                }
              }}
              placeholder="0"
              style={{
                width: 72,
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
                background: C.surfaceAlt,
                border: `1px solid ${C.blue}`,
                borderRadius: 4,
                padding: "2px 6px",
                outline: "none",
                fontFamily: "inherit",
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
              }}
            />
          </div>
        ) : (
          <span
            data-non-expense-add-amount={experience.id}
            onClick={startEditing}
            style={{
              color: isSel ? "rgba(255,255,255,0.5)" : C.textDim,
              flexShrink: 0,
              fontSize: 11,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
              transition: "all 0.1s",
              fontStyle: "italic",
            }}
            onMouseEnter={(e) => {
              if (!isSel) {
                e.currentTarget.style.background = C.surfaceAlt;
                e.currentTarget.style.color = C.textMuted;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSel) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.textDim;
              }
            }}
          >
            Add amount...
          </span>
        )}
      </div>

      {/* Currency picker dropdown */}
      {showCurrencyPicker && (
        <div
          style={{
            position: "absolute",
            right: 8,
            top: "100%",
            marginTop: 2,
            zIndex: 60,
          }}
        >
          <CurrencyPicker
            value={currency}
            onSelect={(c) => setCurrency(c)}
            onClose={() => setShowCurrencyPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Expenses View ───

export function ExpensesView() {
  const entities = useEntityStore((s) => s.entities);
  const updateExperience = useEntityStore((s) => s.updateExperience);
  const addExperience = useEntityStore((s) => s.addExperience);
  const trip = useEntityStore((s) => s.trip);
  const selected = useSelectionStore((s) => s.selected);
  const handleClick = useSelectionStore((s) => s.handleClick);

  const highlighted = computeHighlighted(entities, selected);

  // Filter expenses: experiences with amount != null
  const expenses: Experience[] = [];
  const nonExpenses: Experience[] = [];
  for (const entity of entities.values()) {
    if (isExperience(entity)) {
      if (entity.amount != null) {
        expenses.push(entity);
      } else {
        nonExpenses.push(entity);
      }
    }
  }
  // Sort by sortOrder for consistent display
  expenses.sort((a, b) => a.sortOrder - b.sortOrder);
  nonExpenses.sort((a, b) => a.sortOrder - b.sortOrder);

  // Compute totals
  const totalByCurrency = new Map<Currency, number>();
  for (const exp of expenses) {
    if (exp.amount != null) {
      totalByCurrency.set(
        exp.currency,
        (totalByCurrency.get(exp.currency) || 0) + exp.amount
      );
    }
  }
  const totalStr = formatMultiCurrency(totalByCurrency);

  // Compute highlighted subtotal (selected + highlighted expenses)
  const activeIds = new Set<EntityId>();
  for (const id of selected) activeIds.add(id);
  for (const id of highlighted) activeIds.add(id);

  const activeByCurrency = new Map<Currency, number>();
  for (const exp of expenses) {
    if (activeIds.has(exp.id) && exp.amount != null) {
      activeByCurrency.set(
        exp.currency,
        (activeByCurrency.get(exp.currency) || 0) + exp.amount
      );
    }
  }
  const hasActiveSubtotal = activeByCurrency.size > 0;
  const activeStr = formatMultiCurrency(activeByCurrency);

  // Handlers
  const onSelect = useCallback(
    (id: EntityId, e: React.MouseEvent) => {
      handleClick(id, { ctrlKey: e.ctrlKey, metaKey: e.metaKey });
    },
    [handleClick]
  );

  const onUpdateAmount = useCallback(
    (id: EntityId, amount: number) => {
      updateExperience(id, { amount });
    },
    [updateExperience]
  );

  const onUpdateCurrency = useCallback(
    (id: EntityId, currency: Currency) => {
      updateExperience(id, { currency });
    },
    [updateExperience]
  );

  const onAddExpense = useCallback(
    (name: string) => {
      if (!trip) return;
      // Add as a root-level experience, then set amount to 0 with default JPY
      const id = addExperience(name, null);
      updateExperience(id, { amount: 0, currency: "JPY" });
    },
    [addExperience, updateExperience, trip]
  );

  const onRemoveAmount = useCallback(
    (id: EntityId) => {
      updateExperience(id, { amount: null });
    },
    [updateExperience]
  );

  const onAddAmount = useCallback(
    (id: EntityId, amount: number, currency: Currency) => {
      updateExperience(id, { amount, currency });
    },
    [updateExperience]
  );

  return (
    <div
      data-expenses-view
      style={{
        overflow: "auto",
        height: "100%",
        padding: "10px 0",
        fontSize: 12,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Expense rows */}
      {expenses.map((exp) => {
        const parent = exp.parentId ? entities.get(exp.parentId) : null;
        const parentName = parent ? parent.name : null;

        return (
          <ExpenseRow
            key={exp.id}
            expense={exp}
            parentName={parentName}
            isSelected={selected.has(exp.id)}
            isHighlighted={highlighted.has(exp.id)}
            onSelect={onSelect}
            onUpdateAmount={onUpdateAmount}
            onUpdateCurrency={onUpdateCurrency}
            onRemoveAmount={onRemoveAmount}
          />
        );
      })}

      {/* Add expense row */}
      <InlineAddRow onAdd={onAddExpense} />

      {/* Totals section */}
      <div
        data-expenses-totals
        style={{ margin: "12px 16px 0", padding: 0 }}
      >
        {hasActiveSubtotal && (
          <div
            data-expenses-highlighted-subtotal
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderTop: `1px solid ${C.border}`,
              fontSize: 12,
              color: C.blueText,
            }}
          >
            <span style={{ fontWeight: 500 }}>Highlighted</span>
            <span data-highlighted-amount style={{ fontWeight: 600 }}>
              {activeStr}
            </span>
          </div>
        )}
        <div
          data-expenses-total
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderTop: `1px solid ${C.borderStrong}`,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span>Total</span>
          <span data-total-amount>{totalStr}</span>
        </div>
      </div>

      {/* Non-expense experiences section */}
      {nonExpenses.length > 0 && (
        <>
          <div
            data-non-expenses-header
            style={{
              margin: "16px 16px 8px",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: C.textDim,
            }}
          >
            Experiences without expenses
          </div>
          {nonExpenses.map((exp) => {
            const parent = exp.parentId ? entities.get(exp.parentId) : null;
            const parentName = parent ? parent.name : null;

            return (
              <NonExpenseRow
                key={exp.id}
                experience={exp}
                parentName={parentName}
                isSelected={selected.has(exp.id)}
                isHighlighted={highlighted.has(exp.id)}
                onSelect={onSelect}
                onAddAmount={onAddAmount}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Format helpers ───

function formatMultiCurrency(byCurrency: Map<Currency, number>): string {
  if (byCurrency.size === 0) return "";
  return Array.from(byCurrency.entries())
    .map(([currency, amount]) => fmtAmount(amount, currency))
    .join(" + ");
}
