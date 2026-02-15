# Data Attributes for E2E Testing

This document lists all data attributes that components need to implement for e2e tests to work.

## Why Data Attributes?

Data attributes provide stable, semantic selectors that:
- Don't break when CSS classes change
- Don't depend on text content (which may be localized)
- Clearly indicate an element's purpose in tests
- Don't interfere with styling or behavior

## Component Requirements

### Chip Component (`src/components/Chip.tsx`)

The shared Chip component used in notes, popover, and tree views.

```tsx
<div
  data-entity-chip
  data-entity-id={entity.id}
  data-entity-type={entity.type} // "place" or "experience"
  data-selected={isSelected ? "true" : undefined}
  data-highlighted={isHighlighted ? "true" : undefined}
>
  {/* Place chip structure */}
  {type === "place" && (
    <>
      <div data-icon="pin" onClick={handlePinClick}>
        <PinIcon />
      </div>
      <div data-separator /> {/* Vertical rule */}
      <div data-chip-name onClick={handleNameClick}>
        {entity.name}
      </div>
    </>
  )}

  {/* Experience chip structure */}
  {type === "experience" && (
    <>
      <div data-chip-name onClick={handleNameClick}>
        {entity.name}
      </div>
      {hasPlace && (
        <>
          <div data-separator />
          <div data-indicator="pin" data-icon="pin" onClick={handlePinClick}>
            <PinIcon />
          </div>
        </>
      )}
      {hasSchedule && (
        <>
          <div data-separator />
          <div data-indicator="clock" data-icon="clock" onClick={handleClockClick}>
            <ClockIcon />
          </div>
        </>
      )}
      {hasAmount && (
        <>
          <div data-separator />
          <div data-indicator="amount" onClick={handleAmountClick}>
            {formatAmount(amount, currency)}
          </div>
        </>
      )}
    </>
  )}
</div>
```

### Selection Popover (`src/App.tsx`)

```tsx
{selectedIds.length > 0 && (
  <div data-selection-popover>
    {selectedIds.slice(0, 8).map(id => (
      <Chip
        key={id}
        entity={entities.get(id)}
        isSelected={true}
        onClick={handlePopoverChipClick}
      />
    ))}
    {selectedIds.length > 8 && (
      <div data-overflow-count>
        +{selectedIds.length - 8} more
      </div>
    )}
    <button data-action="clear" onClick={handleClearSelection}>
      ×
    </button>
  </div>
)}
```

### Notes Editor Paragraphs (`src/editor/NotesEditor.tsx`)

Paragraphs should detect if they contain selected/highlighted chips and apply data attributes:

```tsx
// In paragraph rendering logic
<p
  data-paragraph-block
  data-has-selected={containsSelectedChip ? "true" : undefined}
  data-has-highlighted={containsHighlightedChip ? "true" : undefined}
>
  {/* paragraph content with chips */}
</p>
```

### Pane Tabs (`src/App.tsx`)

```tsx
{/* Left pane tabs */}
<div data-pane="left">
  <button
    data-tab="map"
    data-active={leftView === "map" ? "true" : undefined}
    onClick={() => setLeftView("map")}
  >
    Map
  </button>
  <button
    data-tab="schedule"
    data-active={leftView === "schedule" ? "true" : undefined}
    onClick={() => setLeftView("schedule")}
  >
    Schedule
  </button>
  <button
    data-tab="expenses"
    data-active={leftView === "expenses" ? "true" : undefined}
    onClick={() => setLeftView("expenses")}
  >
    Expenses
  </button>
</div>

{/* Right pane tabs */}
<div data-pane="right">
  <button
    data-tab="notes"
    data-active={rightView === "notes" ? "true" : undefined}
    onClick={() => setRightView("notes")}
  >
    Notes
  </button>
  <button
    data-tab="places"
    data-active={rightView === "places" ? "true" : undefined}
    onClick={() => setRightView("places")}
  >
    Places
  </button>
  <button
    data-tab="experiences"
    data-active={rightView === "experiences" ? "true" : undefined}
    onClick={() => setRightView("experiences")}
  >
    Experiences
  </button>
</div>
```

### EntityTreeView (`src/components/tree/EntityTreeView.tsx`)

```tsx
<div data-tree-view={type}> {/* "places" or "experiences" */}
  {/* tree content */}
</div>
```

### TreeNode (`src/components/tree/TreeNode.tsx`)

```tsx
<div
  data-tree-node
  data-entity-id={entity.id}
  data-entity-type={entity.type}
  data-parent-id={entity.parentId || undefined}
  data-has-children={children.length > 0 ? "true" : "false"}
  data-expanded={isExpanded ? "true" : "false"}
  data-selected={isSelected ? "true" : undefined}
  data-highlighted={isHighlighted ? "true" : undefined}
>
  {/* Toggle for expand/collapse */}
  {children.length > 0 && (
    <button data-toggle onClick={handleToggle}>
      {isExpanded ? "▼" : "▶"}
    </button>
  )}

  {/* The clickable row */}
  <div
    data-tree-row
    data-entity-type={entity.type}
    data-is-expense={type === "experience" && entity.amount != null ? "true" : "false"}
    data-has-place={type === "experience" && entity.placeIds?.length > 0 ? "true" : "false"}
    data-has-schedule={type === "experience" && entity.schedule ? "true" : "false"}
    onClick={handleRowClick}
  >
    {/* Place row */}
    {type === "place" && (
      <>
        <div data-row-indicator>
          <div data-icon="pin">
            <PinIcon />
          </div>
        </div>
        <div data-row-name>{entity.name}</div>
        {!entity.coords && (
          <div data-no-location>no loc</div>
        )}
      </>
    )}

    {/* Experience row */}
    {type === "experience" && (
      <>
        <div data-row-indicator>
          {entity.amount != null ? "¥" : "•"}
        </div>
        <div data-row-name>{entity.name}</div>
        {entity.placeIds?.[0] && (
          <div data-row-place>
            <div data-icon="pin">
              <PinIcon />
            </div>
            {getPlaceName(entity.placeIds[0])}
          </div>
        )}
        {entity.schedule && (
          <div data-row-schedule>
            <div data-icon="clock">
              <ClockIcon />
            </div>
            {formatDate(entity.schedule.date)}
          </div>
        )}
        {subtreeCost && (
          <div data-row-cost>
            {formatCost(subtreeCost)}
          </div>
        )}
      </>
    )}
  </div>

  {/* Render children when expanded */}
  {isExpanded && children.map(child => (
    <TreeNode key={child.id} entity={child} depth={depth + 1} />
  ))}
</div>
```

### DropZone (`src/components/tree/DropZone.tsx`)

```tsx
<div
  data-drop-zone
  data-parent-id={parentId || "null"}
  data-index={index}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
  {/* Visual feedback when dragging over */}
</div>
```

### InlineAddRow (`src/components/tree/InlineAddRow.tsx`)

```tsx
<div data-inline-add>
  {isAdding ? (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      autoFocus
    />
  ) : (
    <button onClick={handleStartAdd}>
      + Add {type === "place" ? "place" : "experience"}...
    </button>
  )}
</div>
```

## Attribute Reference

### Core Entity Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-entity-chip` | - | Marks element as an entity chip |
| `data-entity-id` | string | Unique entity identifier |
| `data-entity-type` | "place" \| "experience" | Entity type |
| `data-selected` | "true" \| undefined | Selection state |
| `data-highlighted` | "true" \| undefined | Highlight state |

### Chip Component Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-icon` | "pin" \| "clock" | Icon type |
| `data-indicator` | "pin" \| "clock" \| "amount" | Indicator section type |
| `data-chip-name` | - | Name section of chip |
| `data-separator` | - | Vertical separator |

### Tree View Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-tree-view` | "places" \| "experiences" | Tree view type |
| `data-tree-node` | - | Tree node wrapper |
| `data-tree-row` | - | Clickable row element |
| `data-has-children` | "true" \| "false" | Has child nodes |
| `data-expanded` | "true" \| "false" | Expansion state |
| `data-parent-id` | string \| undefined | Parent entity ID |
| `data-toggle` | - | Expand/collapse button |

### Tree Row Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-row-indicator` | - | Type indicator (¥ or •) |
| `data-row-name` | - | Entity name display |
| `data-row-place` | - | Associated place info |
| `data-row-schedule` | - | Schedule date info |
| `data-row-cost` | - | Aggregated cost display |
| `data-is-expense` | "true" \| "false" | Is expense (has amount) |
| `data-has-place` | "true" \| "false" | Has place association |
| `data-has-schedule` | "true" \| "false" | Has schedule |
| `data-no-location` | - | "no loc" label |

### Navigation Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-pane` | "left" \| "right" | Pane identifier |
| `data-tab` | "map" \| "schedule" \| "expenses" \| "notes" \| "places" \| "experiences" | Tab identifier |
| `data-active` | "true" \| undefined | Active tab state |

### Interaction Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-drop-zone` | - | Drag-and-drop target |
| `data-inline-add` | - | Inline add row |
| `data-selection-popover` | - | Selection popover container |
| `data-action` | "clear" | Action button type |
| `data-overflow-count` | - | "+N more" text |

### Editor Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-paragraph-block` | - | Paragraph block |
| `data-has-selected` | "true" \| undefined | Contains selected entity |
| `data-has-highlighted` | "true" \| undefined | Contains highlighted entity |

## Implementation Notes

### Boolean Attributes

Use `"true"` or `undefined` (not `"false"`):
```tsx
// ✓ Correct
data-selected={isSelected ? "true" : undefined}

// ✗ Wrong (creates data-selected="false" which is still truthy in selectors)
data-selected={isSelected.toString()}
```

### Optional Attributes

Use `undefined` to omit attributes:
```tsx
// ✓ Correct - attribute not present when undefined
data-parent-id={parentId || undefined}

// ✗ Wrong - creates data-parent-id="null"
data-parent-id={parentId || "null"}
```

### Nested Structures

Parent-child relationships should use `data-entity-id` and `data-parent-id`:
```tsx
// Parent
<div data-tree-node data-entity-id="p-kyoto">
  {/* Children */}
  <div data-tree-node data-entity-id="p-fushimi" data-parent-id="p-kyoto" />
</div>
```

## Testing Utilities

### Playwright Selectors

```typescript
// Select by data attribute
page.locator('[data-entity-chip]')

// Select with specific value
page.locator('[data-entity-type="place"]')

// Select with attribute present (regardless of value)
page.locator('[data-selected]')

// Combine attributes
page.locator('[data-entity-chip][data-entity-type="place"][data-selected="true"]')

// By entity ID
page.locator('[data-entity-id="p-kyoto"]')

// Nested selection
page.locator('[data-tree-node] [data-tree-row]')
```

### Common Patterns

```typescript
// Find all selected places
const selectedPlaces = page.locator(
  '[data-entity-type="place"][data-selected="true"]'
);

// Find children of a specific parent
const parentId = await node.getAttribute('data-entity-id');
const children = page.locator(`[data-parent-id="${parentId}"]`);

// Find chips with specific indicator
const chipsWithClock = page.locator('[data-indicator="clock"]');

// Check if element has attribute
const isExpanded = await node.getAttribute('data-expanded') === 'true';
```
