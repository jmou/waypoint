# Testing

## Overview

Waypoint uses Playwright for end-to-end testing. Tests verify UI interactions, entity relationships, and cross-view consistency.

## Running Tests

### All Tests

```bash
pnpm run test:e2e
```

### UI Mode (Recommended)

Interactive mode with visual feedback:

```bash
pnpm run test:e2e:ui
```

Features:
- See pass/fail status
- Click to run individual tests
- Watch execution in browser
- Inspect failures with screenshots
- Time travel debugging

### Headed Mode

See tests run in a real browser:

```bash
pnpm run test:e2e:headed
```

### Specific Phase

```bash
pnpm run test:e2e:phase1  # Notes and chips
pnpm run test:e2e:phase2  # Tree views
pnpm run test:e2e:phase3  # Schedule
pnpm run test:e2e:phase4  # Expenses
pnpm run test:e2e:phase6  # Liveblocks (requires API key)
```

### Debug Mode

```bash
npx playwright test --debug
npx playwright test --debug -g "specific test name"
```

Opens Playwright Inspector for step-by-step debugging.

## Test Structure

### Phases

Tests are organized by implementation phase:

**Phase 1: Notes Editor and Chips** (`e2e/phase1.spec.ts`)
- Chip rendering (places, experiences)
- Chip selection (single, multi, deselect)
- Chip navigation (pin, clock, amount indicators)
- Selection popover
- Highlighting (descendants, associations)
- Visual states (default, selected, highlighted)

**Phase 2: Tree Views** (`e2e/phase2.spec.ts`)
- Places tree hierarchy
- Experiences tree hierarchy
- Tree node metadata display
- Expand/collapse
- Selection and highlighting in trees
- Inline add rows
- Drag-and-drop reparenting
- Drag-and-drop reordering

**Phase 3: Schedule View** (`e2e/phase3.spec.ts`)
- Date range header
- Timezone indicator
- Day groups
- Experience rows
- Time editing
- Drag between dates
- Unscheduled section

**Phase 4: Expenses View** (`e2e/phase4.spec.ts`)
- Expense list filtering
- Amount editing
- Currency picker
- Totals (highlighted subtotal, grand total)
- Multi-currency display

**Phase 6: Liveblocks** (`e2e/phase6.spec.ts`, `e2e/phase6-basic.spec.ts`)
- Entity sync across clients
- Document collaboration
- Presence and cursors
- Selection broadcasting
- Local-only mode

### Test Count

**Total:** ~150+ test scenarios

**By phase:**
- Phase 1: 24 tests
- Phase 2: 22 tests
- Phase 3: 43 tests
- Phase 4: 41 tests
- Phase 6: 28 tests (23 require API key)

## Data Attributes

Tests use data attributes for stable, semantic selectors. This avoids brittle tests that break when CSS classes or text content changes.

### Core Attributes

**Entity identification:**
- `data-entity-chip` - Entity chip element
- `data-entity-id` - Unique entity identifier
- `data-entity-type` - "place" or "experience"

**State:**
- `data-selected` - "true" or undefined
- `data-highlighted` - "true" or undefined

**Chip structure:**
- `data-chip-name` - Name section
- `data-icon` - Icon type ("pin", "clock")
- `data-indicator` - Indicator section ("pin", "clock", "amount")
- `data-separator` - Vertical divider

**Tree structure:**
- `data-tree-view` - Tree type ("places", "experiences")
- `data-tree-node` - Tree node wrapper
- `data-tree-row` - Clickable row
- `data-parent-id` - Parent entity ID
- `data-has-children` - "true" or "false"
- `data-expanded` - "true" or "false"

**Navigation:**
- `data-pane` - "left" or "right"
- `data-tab` - Tab identifier ("map", "notes", etc.)
- `data-active` - "true" or undefined

**Interactions:**
- `data-drop-zone` - Drag-and-drop target
- `data-inline-add` - Inline add row
- `data-selection-popover` - Selection popover container
- `data-action` - Action button type ("clear")

See `e2e/DATA_ATTRIBUTES.md` for complete reference.

## Test Patterns

### Basic Selection

```typescript
test('should select chip on click', async ({ page }) => {
  // Find chip
  const chip = page.locator('[data-entity-chip]').first();

  // Click it
  await chip.click();

  // Verify selected
  await expect(chip).toHaveAttribute('data-selected', 'true');
});
```

### Multi-Selection

```typescript
test('should multi-select with Ctrl+click', async ({ page }) => {
  const chip1 = page.locator('[data-entity-id="p-kyoto"]');
  const chip2 = page.locator('[data-entity-id="p-fushimi"]');

  await chip1.click();
  await chip2.click({ modifiers: ['Control'] });

  await expect(chip1).toHaveAttribute('data-selected', 'true');
  await expect(chip2).toHaveAttribute('data-selected', 'true');
});
```

### Navigation

```typescript
test('should navigate when clicking indicator', async ({ page }) => {
  // Click clock indicator on experience chip
  await page.locator('[data-indicator="clock"]').first().click();

  // Verify schedule tab is active
  await expect(page.locator('[data-tab="schedule"]'))
    .toHaveAttribute('data-active', 'true');
});
```

### Highlighting

```typescript
test('should highlight descendants', async ({ page }) => {
  const parent = page.locator('[data-entity-id="p-kyoto"]');
  const child = page.locator('[data-entity-id="p-fushimi"]');

  await parent.click();

  await expect(parent).toHaveAttribute('data-selected', 'true');
  await expect(child).toHaveAttribute('data-highlighted', 'true');
});
```

### Drag-and-Drop

```typescript
test('should reparent via drag-and-drop', async ({ page }) => {
  const source = page.locator('[data-entity-id="p-fushimi"]');
  const target = page.locator('[data-entity-id="p-kyoto"]');

  await source.dragTo(target);

  await page.waitForTimeout(500); // Wait for state update

  // Verify parent changed
  await expect(source).toHaveAttribute('data-parent-id', 'p-kyoto');
});
```

### Inline Editing

```typescript
test('should edit time inline', async ({ page }) => {
  const timeElement = page.locator('[data-row-schedule]').first();

  await timeElement.click();

  const input = page.locator('input[type="text"]');
  await input.fill('14:30');
  await input.press('Enter');

  await page.waitForTimeout(500);

  await expect(timeElement).toContainText('14:30');
});
```

## Seed Data

Tests run against the Kyoto trip seed data (`src/entities/seed.ts`):

**Places (9):**
- Kyoto (root)
  - Fushimi Inari
    - Main Shrine
  - Arashiyama
    - Bamboo Grove
  - Gion
  - Nishiki Market
  - Kinkaku-ji
  - Unlocated Place (for testing "no loc")

**Experiences (22):**
- Kyoto Trip (root)
  - March 15-19 (days)
    - Activities, meals, etc.
  - Some with schedules, some without
  - Some with amounts (expenses), some without
  - Various place associations

This provides comprehensive coverage of:
- Hierarchy (parents, children, depth)
- Located vs unlocated places
- Scheduled vs unscheduled experiences
- Expenses vs non-expenses
- Single vs multi-place associations

## Best Practices

### 1. Use Data Attributes

Never rely on CSS classes or text content for selection:

```typescript
// ✓ Good
page.locator('[data-entity-chip]')

// ✗ Bad
page.locator('.chip')
page.locator('text=Kyoto')
```

### 2. Wait for State Updates

Mutations are async. Wait before assertions:

```typescript
await store.addPlace({ name: "Tokyo" });
await page.waitForTimeout(500);
await expect(page.locator('[data-entity-id="p-tokyo"]')).toBeVisible();
```

### 3. Check Visibility

Ensure elements are visible before interacting:

```typescript
const element = page.locator('[data-tree-node]').first();
await expect(element).toBeVisible();
await element.click();
```

### 4. Handle Optional Elements

Use conditional checks for elements that may not exist:

```typescript
const unlocatedPlaces = page.locator('[data-no-location]');
if (await unlocatedPlaces.count() > 0) {
  await expect(unlocatedPlaces.first()).toBeVisible();
}
```

### 5. Test Cross-View Consistency

Verify selection persists across view switches:

```typescript
await page.click('[data-entity-id="p-kyoto"]');
await page.click('[data-tab="places"]');
await expect(page.locator('[data-entity-id="p-kyoto"]'))
  .toHaveAttribute('data-selected', 'true');
```

### 6. Use Descriptive Test Names

Follow pattern: "should [action] when [condition]"

```typescript
test('should deselect chip on second click', async ({ page }) => {
  // ...
});

test('should show overflow count when more than 8 selected', async ({ page }) => {
  // ...
});
```

## CI/CD Integration

Playwright config supports CI environments:

**Retry strategy:**
- Local: No retries (fast feedback)
- CI: 2 retries (handle flakes)

**Parallelization:**
- Local: 4 workers
- CI: 1 worker (stability)

**Reporting:**
- HTML report generated on failure
- Screenshots captured on failure
- Trace recorded on first retry

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

**Cause:** Dev server slow to start or element not appearing

**Solutions:**
- Increase timeout: `test.setTimeout(60000)`
- Check `webServer` config in `playwright.config.ts`
- Add explicit waits: `await page.waitForSelector(...)`

### Elements Not Found

**Cause:** Data attributes missing or incorrect

**Solutions:**
- Check component has data attributes in browser DevTools
- Verify attribute spelling matches test selector
- Wait for hydration: `await page.waitForSelector('[data-entity-chip]')`
- Use Playwright Inspector: `npx playwright test --debug`

### Flaky Tests

**Cause:** Race conditions or timing issues

**Solutions:**
- Add explicit waits after mutations: `await page.waitForTimeout(500)`
- Use `waitForSelector` with state: `{ state: 'visible' }`
- Check for race conditions in drag-and-drop tests
- Increase retry count in CI

### Drag-and-Drop Fails

**Cause:** Elements not visible or overlapped

**Solutions:**
- Ensure elements are visible: `await expect(element).toBeVisible()`
- Try `dragTo` with `force: true`
- Verify drop zones rendered: `page.locator('[data-drop-zone]')`
- Check z-index and pointer-events in CSS

## Writing New Tests

### New Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to hydrate
    await page.waitForSelector('[data-entity-chip]');
  });

  test('should do something when condition', async ({ page }) => {
    // Arrange
    const element = page.locator('[data-something]');

    // Act
    await element.click();

    // Assert
    await expect(element).toHaveAttribute('data-state', 'expected');
  });
});
```

### Adding Data Attributes

When implementing a new component that needs testing:

1. Add semantic data attributes
2. Use "true" or undefined for booleans (not "false")
3. Use entity IDs for identification
4. Keep attribute names consistent with existing patterns
5. Document new attributes in `e2e/DATA_ATTRIBUTES.md`

Example:

```tsx
<div
  data-my-component
  data-entity-id={entity.id}
  data-state={isActive ? "true" : undefined}
  data-type={type}
>
  {/* component content */}
</div>
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Test Assertions](https://playwright.dev/docs/test-assertions)
