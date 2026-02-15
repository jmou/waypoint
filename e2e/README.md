# Waypoint E2E Tests

End-to-end tests for the Waypoint collaborative travel planning app, using Playwright.

## Test Coverage

### Phase 1: Notes Editor and Chips (`phase1.spec.ts`)

Tests the core chip component and notes editor functionality:

**Chip Rendering**
- Place chips with pin icon, vertical separator, and name
- Experience chips with indicators (pin, clock, amount)
- Correct color-coding (red for places, blue for experiences)

**Chip Selection**
- Single selection on click
- Deselection on second click
- Multi-selection with Ctrl+click
- Consistent selection state across views

**Chip Indicator Navigation**
- Pin icon on place chips navigates to Map view
- Pin icon on experience chips navigates to Map view (selects experience, not place)
- Clock icon navigates to Schedule view
- Amount indicator navigates to Expenses view

**Selection Popover**
- Appears at bottom-center when entities selected
- Shows selected chips with full indicators
- Clear button (×) clears all selection
- Clicking chip in popover deselects it
- Shows "+N more" when >8 chips selected

**Highlighting**
- Descendants highlighted when parent selected
- Associated places highlighted when experience selected
- Associated experiences highlighted when place selected
- Paragraph blocks highlight when containing selected entities

**Visual States**
- Default, selected (inverted), and highlighted states
- Hover effects on chip indicators
- Semi-transparent backgrounds for highlighted entities
- Solid colored backgrounds for selected entities

### Phase 2: Tree Views (`phase2.spec.ts`)

Tests the Places and Experiences tree view functionality:

**Places Tree View**
- Hierarchical rendering of places
- Pin icon and name display
- "no loc" label for unlocated places
- Expand/collapse parent places
- Selection on row click
- Inline add row for new places

**Experiences Tree View**
- Hierarchical rendering of experiences
- Expense indicator (¥) vs non-expense indicator (dot)
- Associated place display with pin icon
- Schedule date display with clock icon
- Aggregated cost for parent experiences
- Inline add row for new experiences

**Drag and Drop - Reparenting**
- Drag place onto another place to change parent
- Drag experience onto another experience to change parent
- Visual drop zone feedback on drag over

**Drag and Drop - Reordering**
- Reorder sibling places via drag to drop zones
- Reorder sibling experiences via drag to drop zones
- Drop zones appear between siblings during drag

**Selection and Highlighting**
- Tree node selection
- Descendant highlighting when parent selected
- Multi-selection with Ctrl+click
- Selection persistence across view switches

## Running Tests

### Prerequisites

```bash
# Install dependencies (if not already done)
pnpm install

# Install Playwright browsers (if not already done)
npx playwright install chromium
```

### Run All E2E Tests

```bash
pnpm run test:e2e
```

### Run with UI Mode (Interactive)

```bash
pnpm run test:e2e:ui
```

### Run in Headed Mode (See Browser)

```bash
pnpm run test:e2e:headed
```

### Run Specific Phase

```bash
# Run only Phase 1 tests
pnpm run test:e2e:phase1

# Run only Phase 2 tests
pnpm run test:e2e:phase2
```

### Run Specific Test

```bash
# Run a specific test file
npx playwright test e2e/phase1.spec.ts

# Run a specific test by name pattern
npx playwright test -g "should select chip on click"
```

### Debug Tests

```bash
# Run in debug mode with Playwright Inspector
npx playwright test --debug

# Debug a specific test
npx playwright test --debug -g "drag and drop"
```

## Test Architecture

### Data Attributes

Tests rely on data attributes for reliable element selection:

- `data-entity-chip` - Entity chip elements
- `data-entity-id` - Entity unique identifier
- `data-entity-type` - "place" or "experience"
- `data-tree-node` - Tree view node wrapper
- `data-tree-row` - Clickable tree row
- `data-selected` - Selection state (true/false)
- `data-highlighted` - Highlight state (true/false)
- `data-has-children` - Node has children (true/false)
- `data-expanded` - Node expansion state (true/false)
- `data-parent-id` - Parent entity ID
- `data-selection-popover` - Selection popover container
- `data-drop-zone` - Drag-and-drop target zones
- `data-inline-add` - Inline add row input
- `data-icon` - Icon type (pin, clock)
- `data-indicator` - Chip indicator sections
- `data-chip-name` - Chip name section
- `data-row-name` - Tree row name
- `data-row-indicator` - Tree row type indicator

### Seed Data

Tests use the Kyoto trip seed data defined in `src/entities/seed.ts`:
- 9 places (Kyoto, Fushimi Inari, etc.)
- 22 experiences (temple visits, meals, etc.)
- Hierarchical relationships
- Mix of located/unlocated places
- Mix of scheduled/unscheduled experiences
- Mix of expenses and non-expenses

## Writing New Tests

### Best Practices

1. **Use data attributes** - Never rely on CSS classes or text content for selection
2. **Wait for state updates** - Use `await page.waitForTimeout(500)` after mutations
3. **Check visibility** - Use `await expect(element).toBeVisible()` before interactions
4. **Handle optional elements** - Use `if (await element.count() > 0)` for conditional tests
5. **Test cross-view consistency** - Verify selection persists across view switches
6. **Use descriptive test names** - "should [expected behavior] when [condition]"

### Example Test Template

```typescript
test('should [do something] when [condition]', async ({ page }) => {
  // Arrange - navigate to view, find elements
  await page.click('[data-pane="right"] [data-tab="places"]');
  const element = page.locator('[data-tree-node]').first();

  // Act - perform action
  await element.click();

  // Assert - verify outcome
  await expect(element).toHaveAttribute('data-selected', 'true');
});
```

## CI/CD Integration

The Playwright config is set up for CI environments:
- Retries failing tests 2 times in CI
- Runs single worker in CI (for stability)
- Generates HTML report
- Takes screenshots on failure
- Records traces on first retry

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: npx playwright install --with-deps chromium
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Timeout
- Increase timeout in test: `test.setTimeout(60000)`
- Dev server may be slow to start - check `webServer` config

### Elements Not Found
- Check data attributes are present in components
- Wait for hydration: `await page.waitForSelector('[data-entity-chip]')`
- Use Playwright Inspector: `npx playwright test --debug`

### Flaky Tests
- Add explicit waits: `await page.waitForTimeout(500)`
- Use `waitForSelector` with state: `await page.waitForSelector('...', { state: 'visible' })`
- Check for race conditions in drag-and-drop tests

### Drag and Drop Not Working
- Ensure elements are visible and not overlapped
- Try `dragTo` with `force: true` option
- Verify drop zones are properly rendered
