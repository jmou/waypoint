# E2E Test Implementation Guide

This guide helps you add the necessary data attributes to components so the e2e tests can pass.

## Quick Start

1. **Review** `DATA_ATTRIBUTES.md` for complete attribute reference
2. **Run tests** to see which ones fail: `pnpm run test:e2e:ui`
3. **Add data attributes** to components as tests fail
4. **Iterate** until all tests pass

## Implementation Order

### Step 1: Add Data Attributes to Chip Component

The Chip component is used everywhere, so start here.

**File:** `src/components/Chip.tsx`

**Changes needed:**
- Add `data-entity-chip`, `data-entity-id`, `data-entity-type` to root element
- Add `data-selected` and `data-highlighted` based on props
- Add `data-icon`, `data-indicator`, `data-chip-name`, `data-separator` to child elements
- Make indicator sections independently clickable

**Example:**
```tsx
export function Chip({ entity, isSelected, isHighlighted, onNavigate }: ChipProps) {
  return (
    <div
      data-entity-chip
      data-entity-id={entity.id}
      data-entity-type={entity.type}
      data-selected={isSelected ? "true" : undefined}
      data-highlighted={isHighlighted ? "true" : undefined}
      style={/* styling based on state */}
    >
      {/* ... chip content with data attributes ... */}
    </div>
  );
}
```

**Tests this enables:**
- All Chip Rendering tests (3 tests)
- Chip Selection tests (3 tests)
- Chip Visual States tests (3 tests)

---

### Step 2: Add Navigation to Chip Indicators

Make each chip indicator section clickable and call `onNavigate` with the correct view.

**File:** `src/components/Chip.tsx`

**Changes needed:**
- Pin icon on place chips → `onNavigate?.(entity.id, "map")`
- Pin icon on experience chips → `onNavigate?.(entity.id, "map")`
- Clock icon → `onNavigate?.(entity.id, "schedule")`
- Amount → `onNavigate?.(entity.id, "expenses")`
- Name → just select, no navigation

**Tests this enables:**
- Chip Indicator Navigation tests (4 tests)

---

### Step 3: Add Data Attributes to Selection Popover

**File:** `src/App.tsx`

**Changes needed:**
- Add `data-selection-popover` to popover container
- Add `data-action="clear"` to clear button
- Add `data-overflow-count` to "+N more" text
- Ensure popover uses the Chip component (already done)

**Tests this enables:**
- Selection Popover tests (4 tests)

---

### Step 4: Add Pane and Tab Data Attributes

**File:** `src/App.tsx`

**Changes needed:**
- Add `data-pane="left"` and `data-pane="right"` to pane containers
- Add `data-tab` and `data-active` to all tab buttons

**Example:**
```tsx
<div data-pane="left">
  <div className="tabbar">
    <button
      data-tab="map"
      data-active={leftView === "map" ? "true" : undefined}
      onClick={() => setLeftView("map")}
    >
      Map
    </button>
    {/* ... */}
  </div>
</div>
```

**Tests this enables:**
- Enables navigation tests to verify view switching

---

### Step 5: Add Tree View Data Attributes

**File:** `src/components/tree/EntityTreeView.tsx`

**Changes needed:**
- Add `data-tree-view={type}` to root container

**Example:**
```tsx
return (
  <div data-tree-view={type} style={{ padding: 8, paddingLeft: 28 }}>
    {/* tree content */}
  </div>
);
```

**Tests this enables:**
- Tree view rendering tests (2 tests)

---

### Step 6: Add TreeNode Data Attributes

**File:** `src/components/tree/TreeNode.tsx`

**Changes needed:**
- Add comprehensive data attributes to node wrapper
- Add data attributes to row element
- Add data attributes to toggle button
- Add data attributes to row content sections

**Example:**
```tsx
<div
  data-tree-node
  data-entity-id={entity.id}
  data-entity-type={entity.type}
  data-parent-id={entity.parentId || undefined}
  data-has-children={hasChildren ? "true" : "false"}
  data-expanded={isExpanded ? "true" : "false"}
  data-selected={isSelected ? "true" : undefined}
  data-highlighted={isHighlighted ? "true" : undefined}
>
  {hasChildren && (
    <button data-toggle onClick={handleToggle}>
      {isExpanded ? "▼" : "▶"}
    </button>
  )}

  <div
    data-tree-row
    data-entity-type={entity.type}
    onClick={handleClick}
  >
    {/* row content with data attributes */}
  </div>

  {/* children */}
</div>
```

**Tests this enables:**
- Place row rendering tests (2 tests)
- Experience row rendering tests (5 tests)
- Expand/collapse tests (2 tests)
- Selection tests (4 tests)

---

### Step 7: Add DropZone Data Attributes

**File:** `src/components/tree/DropZone.tsx`

**Changes needed:**
- Add `data-drop-zone`, `data-parent-id`, `data-index` to drop zone element

**Tests this enables:**
- Drag and drop visual feedback test (1 test)
- All drag-and-drop tests depend on drop zones being detectable

---

### Step 8: Add InlineAddRow Data Attributes

**File:** `src/components/tree/InlineAddRow.tsx`

**Changes needed:**
- Add `data-inline-add` to container

**Tests this enables:**
- Inline add tests (4 tests)

---

### Step 9: Add Paragraph Highlighting to Notes Editor

**File:** `src/editor/NotesEditor.tsx` or paragraph extension

**Changes needed:**
- Detect which paragraphs contain selected/highlighted chips
- Add `data-paragraph-block`, `data-has-selected`, `data-has-highlighted` to paragraph nodes

This is the most complex part. You'll need to:
1. Walk the editor state to find chip nodes
2. Track which paragraphs contain which chips
3. Apply data attributes via node decorations or custom paragraph node view

**Tests this enables:**
- Paragraph highlighting test (1 test)

---

### Step 10: Implement Highlighting Logic

**Files:** Throughout the app

**Changes needed:**
- Use `computeHighlighted()` from helpers to get highlighted entities
- Pass `isHighlighted` prop to all Chip and TreeNode components
- Ensure highlighting updates when selection changes

**Tests this enables:**
- All highlighting tests (3 tests)

---

## Testing Your Implementation

### Run All Tests

```bash
pnpm run test:e2e
```

### Run Tests in UI Mode (Recommended)

```bash
pnpm run test:e2e:ui
```

This opens an interactive UI where you can:
- See which tests pass/fail
- Click on tests to run them individually
- Watch tests execute in the browser
- Inspect failures with screenshots and traces

### Run Specific Test Suite

```bash
# Just Phase 1
pnpm run test:e2e:phase1

# Just Phase 2
pnpm run test:e2e:phase2
```

### Run a Single Test

```bash
npx playwright test -g "should render place chips"
```

### Debug a Failing Test

```bash
npx playwright test --debug -g "should select chip on click"
```

This opens Playwright Inspector where you can step through the test.

---

## Common Issues and Solutions

### Issue: Element Not Found

**Error:** `Error: Timed out waiting for selector [data-entity-chip]`

**Solution:**
- Check that the data attribute is actually on the element in the browser DevTools
- Ensure the element is rendered (not conditionally hidden)
- Wait for app hydration before test runs (already in `beforeEach`)

### Issue: Data Attribute Has Wrong Value

**Error:** `Expected "true" but got undefined`

**Solution:**
- Use `{condition ? "true" : undefined}` not `{condition.toString()}`
- For IDs, use `{id}` or `{id || undefined}` not `{id || "null"}`

### Issue: Click Not Working

**Error:** `Element is not visible` or `Element is covered by another element`

**Solution:**
- Use `await element.waitForSelector({ state: 'visible' })`
- Ensure element is not `display: none` or `opacity: 0`
- Check z-index if element is covered

### Issue: Drag and Drop Not Working

**Error:** `dragTo failed` or entity not reparented

**Solution:**
- Verify drop zones are rendered with `data-drop-zone`
- Ensure drop zones are visible during drag (dragover state)
- Check that `onMoveTo` handler is actually called and updates store

### Issue: Selection Not Persisting Across Views

**Error:** Selected chip in one view not selected in another

**Solution:**
- Ensure all components read from the same `useSelectionStore()`
- Verify `isSelected = selectedIds.includes(entity.id)` is computed correctly
- Check that selection state is not local to component

---

## Validation Checklist

Before considering the implementation complete:

### Phase 1 Checklist

- [ ] Chip component renders with all data attributes
- [ ] Chip indicators are independently clickable
- [ ] Indicator clicks navigate to correct views
- [ ] Selection popover appears/disappears correctly
- [ ] Selection popover shows chips and clear button
- [ ] Multi-selection with Ctrl+click works
- [ ] Highlighting logic computes correctly
- [ ] Visual states (default, selected, highlighted) are distinct

### Phase 2 Checklist

- [ ] Places tree renders with proper hierarchy
- [ ] Experiences tree renders with proper hierarchy
- [ ] Tree nodes have all required data attributes
- [ ] Expand/collapse toggles work
- [ ] Selection in tree views works
- [ ] Multi-selection in tree views works
- [ ] Inline add rows work (add and cancel)
- [ ] Drag and drop reparenting works
- [ ] Drag and drop reordering works
- [ ] Drop zones are visible during drag
- [ ] Selection persists across view switches

---

## Test Coverage Summary

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Chip Rendering | 3 | Visual structure, icons, colors |
| Chip Selection | 3 | Single, multi, deselection |
| Chip Navigation | 4 | Pin, clock, amount indicators |
| Selection Popover | 4 | Display, clear, chip removal, overflow |
| Highlighting | 3 | Descendants, associations, paragraphs |
| Chip Visual States | 3 | Hover, selection, highlighting |
| Places Tree | 6 | Rendering, structure, interaction |
| Experiences Tree | 6 | Rendering, indicators, metadata |
| Drag - Reparenting | 3 | Place and experience reparenting |
| Drag - Reordering | 2 | Sibling reordering |
| Tree Selection | 3 | Selection, highlighting, persistence |
| **Total** | **40** | **Full Phase 1 & 2 coverage** |

(Note: 4 additional tests are conditional based on data presence)

---

## Next Steps After Tests Pass

Once all tests pass:

1. **Add more edge case tests** - Empty states, validation, error handling
2. **Add Phase 3 tests** - Schedule view tests
3. **Add Phase 4 tests** - Expenses view tests
4. **Add Phase 5 tests** - Map view tests
5. **Set up CI/CD** - Run tests on every PR
6. **Add visual regression tests** - Catch unexpected visual changes
7. **Add accessibility tests** - Keyboard navigation, screen readers
8. **Add performance tests** - Load time, interaction latency

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Test Assertions](https://playwright.dev/docs/test-assertions)
