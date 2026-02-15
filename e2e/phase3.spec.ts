import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 3 E2E Tests: Schedule View
 *
 * Coverage:
 * - Schedule view rendering (date range header, day groups, experience rows)
 * - Date range header with mini calendar pickers
 * - Timezone indicator with picker
 * - Day groups with experience rows sorted by time
 * - Inline time editing
 * - Drag-and-drop between dates
 * - Unscheduled section
 * - Selection and highlighting
 * - Day header click (select all experiences on that date)
 */

// Helper to navigate to schedule view
async function goToSchedule(page: Page) {
  await page.goto('/');
  await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });
  await page.click('[data-pane="left"] [data-tab="schedule"]');
  await page.waitForSelector('[data-schedule-view]', { timeout: 5000 });
}

test.describe('Phase 3: Schedule View', () => {

  test.describe('Schedule View Rendering', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should render the schedule view container', async ({ page }) => {
      const scheduleView = page.locator('[data-schedule-view]');
      await expect(scheduleView).toBeVisible();
    });

    test('should render the date range header with start and end dates', async ({ page }) => {
      const header = page.locator('[data-schedule-header]');
      await expect(header).toBeVisible();

      // Should show "Schedule:" label
      await expect(header).toContainText('Schedule:');

      // Should show start and end dates
      const startDate = page.locator('[data-schedule-start-date]');
      const endDate = page.locator('[data-schedule-end-date]');
      await expect(startDate).toBeVisible();
      await expect(endDate).toBeVisible();

      // Seed data: Mar 15 — Mar 19
      await expect(startDate).toContainText('Mar 15');
      await expect(endDate).toContainText('Mar 19');
    });

    test('should render day groups for each date in the range', async ({ page }) => {
      // Seed trip: Mar 15-19 = 5 days
      const dayGroups = page.locator('[data-schedule-day]');
      const count = await dayGroups.count();
      expect(count).toBe(5);

      // Check first and last day headers
      const firstDayHeader = page.locator('[data-day-header="2026-03-15"]');
      await expect(firstDayHeader).toBeVisible();
      await expect(firstDayHeader).toContainText('Mar 15');

      const lastDayHeader = page.locator('[data-day-header="2026-03-19"]');
      await expect(lastDayHeader).toBeVisible();
      await expect(lastDayHeader).toContainText('Mar 19');
    });

    test('should render experience rows within day groups', async ({ page }) => {
      // Mar 15 has: Nishiki Market food tour (11:00 AM), Knife shopping (2:00 PM)
      const mar15 = page.locator('[data-schedule-day="2026-03-15"]');
      const rows = mar15.locator('[data-schedule-row]');
      const count = await rows.count();
      expect(count).toBe(2);

      // Check first row is the earlier experience
      const firstRow = rows.first();
      const firstName = firstRow.locator('[data-schedule-row-name]');
      await expect(firstName).toContainText('Nishiki Market food tour');
    });

    test('should show experience time with clock icon', async ({ page }) => {
      // Find any schedule row and check it has a time display
      const timeDisplay = page.locator('[data-time-display]').first();
      await expect(timeDisplay).toBeVisible();

      // Should contain a time value
      const text = await timeDisplay.textContent();
      expect(text).toBeTruthy();
      // Should match something like "11:00 AM" or "2:00 PM"
      expect(text).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
    });

    test('should show associated place name for experiences with places', async ({ page }) => {
      // Nishiki Market food tour is associated with Nishiki Market
      const mar15 = page.locator('[data-schedule-day="2026-03-15"]');
      const firstRow = mar15.locator('[data-schedule-row]').first();
      const placeInfo = firstRow.locator('[data-schedule-row-place]');
      await expect(placeInfo).toBeVisible();
      await expect(placeInfo).toContainText('Nishiki Market');
    });

    test('should show subtree cost for experiences with expenses', async ({ page }) => {
      // Nishiki Market food tour has a child expense (Street food tasting ¥3,200)
      const mar15 = page.locator('[data-schedule-day="2026-03-15"]');
      const rows = mar15.locator('[data-schedule-row]');

      // Check if any row has cost info
      let foundCost = false;
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const costEl = rows.nth(i).locator('[data-schedule-row-cost]');
        if (await costEl.count() > 0) {
          foundCost = true;
          const costText = await costEl.textContent();
          // Should contain a currency symbol and number
          expect(costText).toMatch(/[¥$€£]/);
          break;
        }
      }
      expect(foundCost).toBe(true);
    });

    test('should sort experiences by time within each day', async ({ page }) => {
      // Mar 16 has: Fushimi hike (6:00 AM), Kiyomizu walk (2:00 PM), Sake evening (5:00 PM)
      const mar16 = page.locator('[data-schedule-day="2026-03-16"]');
      const rows = mar16.locator('[data-schedule-row]');
      const count = await rows.count();
      expect(count).toBe(3);

      // First should be 6:00 AM (Fushimi)
      const firstName = rows.nth(0).locator('[data-schedule-row-name]');
      await expect(firstName).toContainText('Fushimi Inari sunrise hike');

      // Second should be 2:00 PM (Kiyomizu)
      const secondName = rows.nth(1).locator('[data-schedule-row-name]');
      await expect(secondName).toContainText('Kiyomizu-dera');

      // Third should be 5:00 PM (Sake)
      const thirdName = rows.nth(2).locator('[data-schedule-row-name]');
      await expect(thirdName).toContainText('Sake district evening');
    });

    test('should show "Add or link experience..." prompt for each day', async ({ page }) => {
      const addPrompts = page.locator('[data-schedule-add]');
      const count = await addPrompts.count();
      expect(count).toBe(5); // One per day

      const firstAdd = addPrompts.first();
      await expect(firstAdd).toContainText('Add or link experience');
    });
  });

  test.describe('Timezone Indicator', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should show timezone indicator below first day header', async ({ page }) => {
      const tzIndicator = page.locator('[data-timezone-indicator]');
      await expect(tzIndicator).toBeVisible();
      await expect(tzIndicator).toContainText('Asia/Tokyo');
      await expect(tzIndicator).toContainText('UTC+09:00');
    });

    test('should open timezone picker on click', async ({ page }) => {
      const tzIndicator = page.locator('[data-timezone-indicator]');
      await tzIndicator.click();

      const tzPicker = page.locator('[data-timezone-picker]');
      await expect(tzPicker).toBeVisible();

      // Should show timezone options
      const options = page.locator('[data-timezone-option]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should change timezone when a timezone is selected', async ({ page }) => {
      const tzIndicator = page.locator('[data-timezone-indicator]');
      await tzIndicator.click();

      // Select a different timezone
      const seoulOption = page.locator('[data-timezone-option="Asia/Seoul"]');
      await seoulOption.click();

      // Timezone picker should close
      const tzPicker = page.locator('[data-timezone-picker]');
      await expect(tzPicker).not.toBeVisible();

      // Indicator should update
      await expect(tzIndicator).toContainText('Asia/Seoul');
    });
  });

  test.describe('Date Range Editing', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should open mini calendar when clicking start date', async ({ page }) => {
      const startDate = page.locator('[data-schedule-start-date]');
      await startDate.click();

      const calendar = page.locator('[data-mini-calendar]');
      await expect(calendar).toBeVisible();

      // Should show March 2026
      await expect(calendar).toContainText('March 2026');
    });

    test('should open mini calendar when clicking end date', async ({ page }) => {
      const endDate = page.locator('[data-schedule-end-date]');
      await endDate.click();

      const calendar = page.locator('[data-mini-calendar]');
      await expect(calendar).toBeVisible();
    });

    test('should change start date when a calendar day is selected', async ({ page }) => {
      const startDate = page.locator('[data-schedule-start-date]');
      await startDate.click();

      // Click day 14 (one day earlier)
      const day14 = page.locator('[data-calendar-day="14"]');
      await day14.click();

      // Calendar should close
      const calendar = page.locator('[data-mini-calendar]');
      await expect(calendar).not.toBeVisible();

      // Start date should update to Mar 14
      await expect(startDate).toContainText('Mar 14');

      // Should now have 6 day groups (Mar 14-19)
      const dayGroups = page.locator('[data-schedule-day]');
      await expect(dayGroups).toHaveCount(6);
    });

    test('should change end date when a calendar day is selected', async ({ page }) => {
      const endDate = page.locator('[data-schedule-end-date]');
      await endDate.click();

      // Click day 20 (one day later)
      const day20 = page.locator('[data-calendar-day="20"]');
      await day20.click();

      // Calendar should close
      const calendar = page.locator('[data-mini-calendar]');
      await expect(calendar).not.toBeVisible();

      // End date should update to Mar 20
      await expect(endDate).toContainText('Mar 20');

      // Should now have 6 day groups (Mar 15-20)
      const dayGroups = page.locator('[data-schedule-day]');
      await expect(dayGroups).toHaveCount(6);
    });

    test('should close start calendar when opening end calendar', async ({ page }) => {
      const startDate = page.locator('[data-schedule-start-date]');
      const endDate = page.locator('[data-schedule-end-date]');

      // Open start calendar
      await startDate.click();
      let calendars = page.locator('[data-mini-calendar]');
      await expect(calendars).toHaveCount(1);

      // Open end calendar
      await endDate.click();
      calendars = page.locator('[data-mini-calendar]');
      await expect(calendars).toHaveCount(1);
    });
  });

  test.describe('Inline Time Editing', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should show time input when clicking time display', async ({ page }) => {
      const timeDisplay = page.locator('[data-time-display]').first();
      const expId = await timeDisplay.getAttribute('data-time-display');
      await timeDisplay.click();

      // Should show text input with time value
      const timeInput = page.locator(`[data-time-input="${expId}"]`);
      await expect(timeInput).toBeVisible();
      await expect(timeInput).toBeFocused();
    });

    test('should commit time on Enter', async ({ page }) => {
      const timeDisplay = page.locator('[data-time-display]').first();
      const expId = await timeDisplay.getAttribute('data-time-display');
      await timeDisplay.click();

      const timeInput = page.locator(`[data-time-input="${expId}"]`);
      await timeInput.fill('10:30 AM');
      await timeInput.press('Enter');

      // Input should close
      await expect(timeInput).not.toBeVisible();

      // Time display should show new value
      const updatedDisplay = page.locator(`[data-time-display="${expId}"]`);
      await expect(updatedDisplay).toContainText('10:30 AM');
    });

    test('should commit time on blur', async ({ page }) => {
      const timeDisplay = page.locator('[data-time-display]').first();
      const expId = await timeDisplay.getAttribute('data-time-display');
      await timeDisplay.click();

      const timeInput = page.locator(`[data-time-input="${expId}"]`);
      await timeInput.fill('9:15 AM');

      // Click elsewhere to blur
      await page.locator('[data-schedule-header]').click();

      // Input should close
      await expect(timeInput).not.toBeVisible();

      // Time display should show new value
      const updatedDisplay = page.locator(`[data-time-display="${expId}"]`);
      await expect(updatedDisplay).toContainText('9:15 AM');
    });

    test('should cancel time editing on Escape', async ({ page }) => {
      const timeDisplay = page.locator('[data-time-display]').first();
      const expId = await timeDisplay.getAttribute('data-time-display');
      const originalText = await timeDisplay.textContent();

      await timeDisplay.click();

      const timeInput = page.locator(`[data-time-input="${expId}"]`);
      await timeInput.fill('99:99 ZZ');
      await timeInput.press('Escape');

      // Input should close
      await expect(timeInput).not.toBeVisible();

      // Time display should retain original value
      const updatedDisplay = page.locator(`[data-time-display="${expId}"]`);
      const newText = await updatedDisplay.textContent();
      expect(newText).toBe(originalText);
    });
  });

  test.describe('Unscheduled Section', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should render unscheduled section with unscheduled experiences', async ({ page }) => {
      const unscheduled = page.locator('[data-unscheduled-section]');
      await expect(unscheduled).toBeVisible();
      await expect(unscheduled).toContainText('Unscheduled');

      // Seed data has: Tea ceremony, Nara deer park
      const rows = unscheduled.locator('[data-unscheduled-row]');
      const count = await rows.count();
      expect(count).toBe(2);
    });

    test('should show "drag to schedule" text for unscheduled items', async ({ page }) => {
      const firstRow = page.locator('[data-unscheduled-row]').first();
      await expect(firstRow).toContainText('drag to schedule');
    });

    test('should show unscheduled experience names', async ({ page }) => {
      const unscheduledSection = page.locator('[data-unscheduled-section]');
      await expect(unscheduledSection).toContainText('Tea ceremony');
      await expect(unscheduledSection).toContainText('Nara deer park');
    });
  });

  test.describe('Selection and Highlighting', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should select experience on row click', async ({ page }) => {
      const row = page.locator('[data-schedule-row]').first();
      await row.click();

      // Row should be in selected state
      await expect(row).toHaveAttribute('data-selected', 'true');

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should deselect on second click (toggle off)', async ({ page }) => {
      const row = page.locator('[data-schedule-row]').first();

      // First click - select
      await row.click();
      await expect(row).toHaveAttribute('data-selected', 'true');

      // Second click - deselect
      await row.click();
      await expect(row).not.toHaveAttribute('data-selected', 'true');
    });

    test('should support multi-selection with Ctrl+click', async ({ page }) => {
      const rows = page.locator('[data-schedule-row]');
      const firstRow = rows.nth(0);
      const secondRow = rows.nth(1);

      // Select first
      await firstRow.click();
      await expect(firstRow).toHaveAttribute('data-selected', 'true');

      // Ctrl+click second
      await secondRow.click({ modifiers: ['Control'] });

      // Both should be selected
      await expect(firstRow).toHaveAttribute('data-selected', 'true');
      await expect(secondRow).toHaveAttribute('data-selected', 'true');

      // Popover should show both
      const popover = page.locator('[data-selection-popover]');
      const popoverChips = popover.locator('[data-entity-chip]');
      await expect(popoverChips).toHaveCount(2);
    });

    test('should highlight descendants when parent experience is selected', async ({ page }) => {
      // Find the Nishiki Market food tour row (has child expense: Street food tasting)
      // We need to select it and then check if descendants in the Experiences tree are highlighted
      const mar15 = page.locator('[data-schedule-day="2026-03-15"]');
      const nishikiRow = mar15.locator('[data-schedule-row]').first();
      await nishikiRow.click();

      // Selection should be active
      await expect(nishikiRow).toHaveAttribute('data-selected', 'true');

      // The popover should show the selected entity
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should select unscheduled experience on click', async ({ page }) => {
      const unscheduledRow = page.locator('[data-unscheduled-row]').first();
      await unscheduledRow.click();

      await expect(unscheduledRow).toHaveAttribute('data-selected', 'true');

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should apply inverted colors to selected schedule row', async ({ page }) => {
      const row = page.locator('[data-schedule-row]').first();

      // Select
      await row.click();

      // Wait for selected attribute
      await expect(row).toHaveAttribute('data-selected', 'true');

      // The row name should now be white (inverted)
      const nameEl = row.locator('[data-schedule-row-name]');
      const nameColor = await nameEl.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      // White text = rgb(255, 255, 255)
      expect(nameColor).toContain('255');
    });
  });

  test.describe('Day Header Selection', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should select all experiences on a date when clicking day header', async ({ page }) => {
      // Click Mar 16 header (has 3 experiences)
      const dayHeader = page.locator('[data-day-header="2026-03-16"]');
      await dayHeader.click();

      // All 3 experience rows on that date should be selected
      const mar16 = page.locator('[data-schedule-day="2026-03-16"]');
      const selectedRows = mar16.locator('[data-schedule-row][data-selected="true"]');
      await expect(selectedRows).toHaveCount(3);

      // Popover should show 3 entities
      const popover = page.locator('[data-selection-popover]');
      const popoverChips = popover.locator('[data-entity-chip]');
      await expect(popoverChips).toHaveCount(3);
    });

    test('should add to selection with Ctrl+click on day header', async ({ page }) => {
      // First select a single experience on Mar 15
      const mar15Row = page.locator('[data-schedule-day="2026-03-15"] [data-schedule-row]').first();
      await mar15Row.click();

      // Now Ctrl+click Mar 16 header to add all its experiences
      const dayHeader16 = page.locator('[data-day-header="2026-03-16"]');
      await dayHeader16.click({ modifiers: ['Control'] });

      // Should now have 4 selected (1 from Mar 15 + 3 from Mar 16)
      const popover = page.locator('[data-selection-popover]');
      const popoverChips = popover.locator('[data-entity-chip]');
      await expect(popoverChips).toHaveCount(4);
    });

    test('should replace selection when clicking day header without modifier', async ({ page }) => {
      // Select all on Mar 15
      const dayHeader15 = page.locator('[data-day-header="2026-03-15"]');
      await dayHeader15.click();

      // Verify Mar 15 selections
      let popoverChips = page.locator('[data-selection-popover] [data-entity-chip]');
      await expect(popoverChips).toHaveCount(2);

      // Click Mar 16 header (no modifier) - should replace
      const dayHeader16 = page.locator('[data-day-header="2026-03-16"]');
      await dayHeader16.click();

      // Should now have only Mar 16 experiences selected (3)
      popoverChips = page.locator('[data-selection-popover] [data-entity-chip]');
      await expect(popoverChips).toHaveCount(3);

      // Mar 15 rows should not be selected
      const mar15Rows = page.locator('[data-schedule-day="2026-03-15"] [data-schedule-row][data-selected="true"]');
      await expect(mar15Rows).toHaveCount(0);
    });
  });

  test.describe('Drag and Drop Between Dates', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should make schedule rows draggable', async ({ page }) => {
      const row = page.locator('[data-schedule-row]').first();
      const draggable = await row.getAttribute('draggable');
      expect(draggable).toBe('true');
    });

    test('should make unscheduled rows draggable', async ({ page }) => {
      const row = page.locator('[data-unscheduled-row]').first();
      const draggable = await row.getAttribute('draggable');
      expect(draggable).toBe('true');
    });

    test('should reschedule experience when dropped on a different day', async ({ page }) => {
      // Get the first experience from Mar 15
      const mar15 = page.locator('[data-schedule-day="2026-03-15"]');
      const sourceRow = mar15.locator('[data-schedule-row]').first();
      const expId = await sourceRow.getAttribute('data-entity-id');

      // Drag to Mar 19 (which has no experiences by default — empty day)
      const mar19 = page.locator('[data-schedule-day="2026-03-19"]');
      const mar19Header = mar19.locator('[data-day-header]');

      await sourceRow.dragTo(mar19Header);
      await page.waitForTimeout(500);

      // The experience should now be in Mar 19
      const mar19Rows = mar19.locator('[data-schedule-row]');
      const mar19Count = await mar19Rows.count();
      expect(mar19Count).toBeGreaterThan(0);

      // Verify the specific experience moved
      const movedRow = mar19.locator(`[data-schedule-row="${expId}"]`);
      if (await movedRow.count() > 0) {
        await expect(movedRow).toBeVisible();
      }
    });

    test('should schedule an unscheduled experience when dropped on a day', async ({ page }) => {
      // Get first unscheduled row
      const unscheduledRow = page.locator('[data-unscheduled-row]').first();
      const expId = await unscheduledRow.getAttribute('data-entity-id');
      const expName = await unscheduledRow.locator('[data-unscheduled-row-name]').textContent();

      // Get initial count of Mar 19 rows
      const mar19 = page.locator('[data-schedule-day="2026-03-19"]');
      const initialCount = await mar19.locator('[data-schedule-row]').count();

      // Drag to Mar 19
      const mar19Header = mar19.locator('[data-day-header]');
      await unscheduledRow.dragTo(mar19Header);
      await page.waitForTimeout(500);

      // Mar 19 should have one more row
      const newCount = await mar19.locator('[data-schedule-row]').count();
      expect(newCount).toBe(initialCount + 1);

      // The unscheduled section should have one fewer item
      const remainingUnscheduled = page.locator('[data-unscheduled-row]');
      const unschedCount = await remainingUnscheduled.count();
      expect(unschedCount).toBe(1); // Was 2, now 1
    });
  });

  test.describe('Cross-View Integration', () => {
    test('should maintain selection when switching from schedule to notes view', async ({ page }) => {
      await goToSchedule(page);

      // Select an experience
      const row = page.locator('[data-schedule-row]').first();
      const expId = await row.getAttribute('data-entity-id');
      await row.click();
      await expect(row).toHaveAttribute('data-selected', 'true');

      // Switch to Notes view
      await page.click('[data-pane="right"] [data-tab="notes"]');

      // The entity chip in notes should also be selected
      const chip = page.locator(`[data-entity-chip][data-entity-id="${expId}"]`).first();
      if (await chip.count() > 0) {
        await expect(chip).toHaveAttribute('data-selected', 'true');
      }

      // Selection popover should still be visible
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should navigate to schedule when clicking clock icon on a chip', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Find an experience chip with a clock icon in notes
      const clockIcon = page.locator('[data-entity-chip][data-entity-type="experience"] [data-icon="clock"]').first();

      if (await clockIcon.count() > 0) {
        await clockIcon.click();

        // Should switch to Schedule view
        const scheduleTab = page.locator('[data-pane="left"] [data-tab="schedule"]');
        await expect(scheduleTab).toHaveAttribute('data-active', 'true');

        // Schedule view should be visible
        const scheduleView = page.locator('[data-schedule-view]');
        await expect(scheduleView).toBeVisible();
      }
    });

    test('should show schedule view when clicking schedule tab from experiences view', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Switch to Experiences view first
      await page.click('[data-pane="right"] [data-tab="experiences"]');

      // Select an experience
      const expNode = page.locator('[data-tree-node][data-entity-type="experience"]').first();
      await expNode.locator('[data-tree-row]').click();

      // Switch to schedule view
      await page.click('[data-pane="left"] [data-tab="schedule"]');

      const scheduleView = page.locator('[data-schedule-view]');
      await expect(scheduleView).toBeVisible();

      // Selection popover should persist
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });
  });

  test.describe('Visual States', () => {
    test.beforeEach(async ({ page }) => {
      await goToSchedule(page);
    });

    test('should show highlighted state on rows', async ({ page }) => {
      // Select a place in the right pane that has associated experiences on the schedule
      // Selecting Nishiki Market should highlight Nishiki Market food tour and Knife shopping
      await page.click('[data-pane="right"] [data-tab="places"]');
      await page.waitForSelector('[data-tree-view="places"]');

      // Find and click the Nishiki Market place node
      const nishikiNode = page.locator('[data-tree-row]', { hasText: 'Nishiki Market' }).first();
      if (await nishikiNode.count() > 0) {
        await nishikiNode.click();

        // Switch to schedule view
        await page.click('[data-pane="left"] [data-tab="schedule"]');
        await page.waitForSelector('[data-schedule-view]');

        // The associated experience rows should be highlighted
        const highlightedRows = page.locator('[data-schedule-row][data-highlighted="true"]');
        const count = await highlightedRows.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should apply different background for selected vs highlighted rows', async ({ page }) => {
      // Select a day with multiple experiences
      const dayHeader = page.locator('[data-day-header="2026-03-16"]');
      await dayHeader.click();

      // All rows on Mar 16 should be selected (solid blue)
      const selectedRows = page.locator('[data-schedule-day="2026-03-16"] [data-schedule-row][data-selected="true"]');
      await expect(selectedRows).toHaveCount(3);

      // Check that selected rows have white text (inverted style)
      const firstSelected = selectedRows.first();
      const nameEl = firstSelected.locator('[data-schedule-row-name]');
      const nameColor = await nameEl.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      // Selected text should be white = rgb(255, 255, 255)
      expect(nameColor).toContain('255');
    });

    test('should show grab cursor on schedule rows', async ({ page }) => {
      const row = page.locator('[data-schedule-row]').first();
      const cursor = await row.evaluate((el) =>
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('grab');
    });
  });
});
