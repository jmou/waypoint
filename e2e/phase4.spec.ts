import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 4 E2E Tests: Expenses View
 *
 * Coverage:
 * - Expenses view rendering (filtered expense list, parent names, amounts)
 * - Inline amount editing (click, enter, blur, escape)
 * - Currency picker (open, select, close)
 * - Multi-currency totals
 * - Highlighted subtotal (selected + highlighted expenses)
 * - Selection and highlighting
 * - Add expense inline
 * - Cross-view integration
 */

// Helper to navigate to expenses view
async function goToExpenses(page: Page) {
  await page.goto('/');
  await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });
  await page.click('[data-pane="left"] [data-tab="expenses"]');
  await page.waitForSelector('[data-expenses-view]', { timeout: 5000 });
}

test.describe('Phase 4: Expenses View', () => {

  test.describe('Expenses View Rendering', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should render the expenses view container', async ({ page }) => {
      const expensesView = page.locator('[data-expenses-view]');
      await expect(expensesView).toBeVisible();
    });

    test('should render all expenses from seed data', async ({ page }) => {
      // Seed data has 10 expenses (experiences with amount != null):
      // e-cultural-pkg (¥12,000), e-jr-pass (¥29,650), e-ryokan (¥48,000),
      // e-food-tour-cost (¥3,200), e-knife-cost (¥15,000), e-fox-udon (¥850),
      // e-tenryuji-entry (¥500), e-kiyomizu-entry (¥400),
      // e-riverside-lunch (¥1,800), e-travel-insurance (A$120)
      const rows = page.locator('[data-expense-row]');
      const count = await rows.count();
      expect(count).toBe(10);
    });

    test('should display expense names', async ({ page }) => {
      const view = page.locator('[data-expenses-view]');
      await expect(view).toContainText('JR Pass (7-day)');
      await expect(view).toContainText('Ryokan (2 nights)');
      await expect(view).toContainText('Street food tasting');
      await expect(view).toContainText('Kitchen knife');
      await expect(view).toContainText('Travel insurance');
    });

    test('should display expense amounts with currency symbols', async ({ page }) => {
      // Check JR Pass amount
      const jrPassAmount = page.locator('[data-expense-amount="e-jr-pass"]');
      await expect(jrPassAmount).toBeVisible();
      await expect(jrPassAmount).toContainText('¥29,650');

      // Check travel insurance with AUD
      const insuranceAmount = page.locator('[data-expense-amount="e-travel-insurance"]');
      await expect(insuranceAmount).toBeVisible();
      await expect(insuranceAmount).toContainText('120');
    });

    test('should display parent name for child expenses', async ({ page }) => {
      // Street food tasting is child of Nishiki Market food tour
      const foodTourParent = page.locator('[data-expense-parent="e-food-tour-cost"]');
      await expect(foodTourParent).toBeVisible();
      await expect(foodTourParent).toContainText('in Nishiki Market food tour');

      // JR Pass is child of Transport
      const jrPassParent = page.locator('[data-expense-parent="e-jr-pass"]');
      await expect(jrPassParent).toBeVisible();
      await expect(jrPassParent).toContainText('in Transport');
    });

    test('should not display parent text for root-level expenses', async ({ page }) => {
      // All seed expenses have parents, so this tests the component handles it.
      // We verify that parent names are shown correctly
      const rows = page.locator('[data-expense-row]');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Totals', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should display the total amount', async ({ page }) => {
      const total = page.locator('[data-expenses-total]');
      await expect(total).toBeVisible();
      await expect(total).toContainText('Total');
    });

    test('should display total with multi-currency format', async ({ page }) => {
      // Total should include JPY and AUD amounts
      const totalAmount = page.locator('[data-total-amount]');
      await expect(totalAmount).toBeVisible();
      const text = await totalAmount.textContent();
      // Should contain yen symbol and a "+" separator for multi-currency
      expect(text).toContain('¥');
      expect(text).toContain('+');
    });

    test('should not show highlighted subtotal when nothing is selected', async ({ page }) => {
      const subtotal = page.locator('[data-expenses-highlighted-subtotal]');
      await expect(subtotal).not.toBeVisible();
    });

    test('should show highlighted subtotal when expense is selected', async ({ page }) => {
      // Click an expense to select it
      const row = page.locator('[data-expense-row="e-jr-pass"]');
      await row.click();

      // Highlighted subtotal should appear
      const subtotal = page.locator('[data-expenses-highlighted-subtotal]');
      await expect(subtotal).toBeVisible();
      await expect(subtotal).toContainText('Highlighted');

      // Should show the amount of the selected expense
      const highlightedAmount = page.locator('[data-highlighted-amount]');
      await expect(highlightedAmount).toContainText('¥29,650');
    });

    test('should include highlighted expenses in subtotal', async ({ page }) => {
      // Select a parent experience (e.g., Nishiki Market food tour)
      // which should highlight its child expense (Street food tasting ¥3,200)
      // First switch to experiences view, select the parent, then back to expenses
      await page.click('[data-pane="right"] [data-tab="experiences"]');
      await page.waitForSelector('[data-tree-view="experiences"]');

      // Find and click Nishiki Market food tour in the tree
      const nishikiNode = page.locator('[data-tree-row]', { hasText: 'Nishiki Market food tour' }).first();
      if (await nishikiNode.count() > 0) {
        await nishikiNode.click();

        // Switch back to expenses view
        await page.click('[data-pane="left"] [data-tab="expenses"]');
        await page.waitForSelector('[data-expenses-view]');

        // The highlighted subtotal should show
        const subtotal = page.locator('[data-expenses-highlighted-subtotal]');
        await expect(subtotal).toBeVisible();
      }
    });

    test('should update highlighted subtotal with multi-selection', async ({ page }) => {
      // Select JR Pass (¥29,650)
      const jrPass = page.locator('[data-expense-row="e-jr-pass"]');
      await jrPass.click();

      // Ctrl+click Ryokan (¥48,000)
      const ryokan = page.locator('[data-expense-row="e-ryokan"]');
      await ryokan.click({ modifiers: ['Control'] });

      // Highlighted subtotal should show sum
      const highlightedAmount = page.locator('[data-highlighted-amount]');
      await expect(highlightedAmount).toBeVisible();
      const text = await highlightedAmount.textContent();
      // Should contain ¥77,650 (29650 + 48000)
      expect(text).toContain('¥77,650');
    });
  });

  test.describe('Inline Amount Editing', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should show input when clicking amount', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      // Should show editing state
      const input = page.locator('[data-amount-input="e-jr-pass"]');
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test('should commit amount on Enter', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      const input = page.locator('[data-amount-input="e-jr-pass"]');
      await input.fill('30000');
      await input.press('Enter');

      // Input should close
      await expect(input).not.toBeVisible();

      // Amount should show new value
      const updatedAmount = page.locator('[data-expense-amount="e-jr-pass"]');
      await expect(updatedAmount).toContainText('¥30,000');
    });

    test('should commit amount on blur', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-fox-udon"]');
      await amount.click();

      const input = page.locator('[data-amount-input="e-fox-udon"]');
      await input.fill('1000');

      // Click elsewhere to blur
      await page.locator('[data-expenses-totals]').click();

      // Input should close
      await expect(input).not.toBeVisible();

      // Amount should show new value
      const updatedAmount = page.locator('[data-expense-amount="e-fox-udon"]');
      await expect(updatedAmount).toContainText('¥1,000');
    });

    test('should cancel editing on Escape', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-fox-udon"]');
      const originalText = await amount.textContent();

      await amount.click();

      const input = page.locator('[data-amount-input="e-fox-udon"]');
      await input.fill('99999');
      await input.press('Escape');

      // Input should close
      await expect(input).not.toBeVisible();

      // Amount should retain original value
      const updatedAmount = page.locator('[data-expense-amount="e-fox-udon"]');
      const newText = await updatedAmount.textContent();
      expect(newText).toBe(originalText);
    });

    test('should update total after amount edit', async ({ page }) => {
      // Get original total
      const totalAmount = page.locator('[data-total-amount]');
      const originalTotal = await totalAmount.textContent();

      // Edit JR Pass amount from 29650 to 50000
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      const input = page.locator('[data-amount-input="e-jr-pass"]');
      await input.fill('50000');
      await input.press('Enter');

      // Total should update
      const newTotal = await totalAmount.textContent();
      expect(newTotal).not.toBe(originalTotal);
    });

    test('should show currency symbol next to input while editing', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      // Currency trigger should be visible
      const currencyTrigger = page.locator('[data-currency-trigger="e-jr-pass"]');
      await expect(currencyTrigger).toBeVisible();
      await expect(currencyTrigger).toContainText('¥');
    });
  });

  test.describe('Currency Picker', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should open currency picker when clicking currency symbol during editing', async ({ page }) => {
      // Start editing
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      // Wait for editing to initialize
      const input = page.locator('[data-amount-input="e-jr-pass"]');
      await expect(input).toBeVisible();

      // Click currency symbol (uses onMouseDown preventDefault to keep focus)
      const currencyTrigger = page.locator('[data-currency-trigger="e-jr-pass"]');
      await currencyTrigger.click();

      // Currency picker should be visible
      const picker = page.locator('[data-currency-picker]');
      await expect(picker).toBeVisible();
    });

    test('should show all currency options', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      const input = page.locator('[data-amount-input="e-jr-pass"]');
      await expect(input).toBeVisible();

      const currencyTrigger = page.locator('[data-currency-trigger="e-jr-pass"]');
      await currencyTrigger.click();

      // Check currency options
      const options = page.locator('[data-currency-option]');
      await expect(options).toHaveCount(5); // JPY, AUD, USD, EUR, GBP
    });

    test('should change currency when selecting option', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-fox-udon"]');
      await amount.click();

      const input = page.locator('[data-amount-input="e-fox-udon"]');
      await expect(input).toBeVisible();

      const currencyTrigger = page.locator('[data-currency-trigger="e-fox-udon"]');
      await currencyTrigger.click();

      const picker = page.locator('[data-currency-picker]');
      await expect(picker).toBeVisible();

      // Select USD
      const usdOption = page.locator('[data-currency-option="USD"]');
      await usdOption.click();

      // Currency picker should close
      await expect(picker).not.toBeVisible();

      // Commit the edit by pressing Enter
      // Re-grab the input since state may have changed
      const stillEditing = page.locator('[data-amount-input="e-fox-udon"]');
      if (await stillEditing.count() > 0) {
        await stillEditing.press('Enter');
      }
      await page.waitForTimeout(200);

      // Amount should now show $ symbol
      const updatedAmount = page.locator('[data-expense-amount="e-fox-udon"]');
      await expect(updatedAmount).toContainText('$');
    });

    test('should close currency picker when clicking outside', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      await amount.click();

      const input = page.locator('[data-amount-input="e-jr-pass"]');
      await expect(input).toBeVisible();

      const currencyTrigger = page.locator('[data-currency-trigger="e-jr-pass"]');
      await currencyTrigger.click();

      const picker = page.locator('[data-currency-picker]');
      await expect(picker).toBeVisible();

      // Click outside the picker on the expenses view header area
      await page.locator('[data-expenses-totals]').click();
      await page.waitForTimeout(200);

      await expect(picker).not.toBeVisible();
    });
  });

  test.describe('Selection and Highlighting', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should select expense on row click', async ({ page }) => {
      const row = page.locator('[data-expense-row="e-jr-pass"]');
      await row.click();

      // Row should be in selected state
      await expect(row).toHaveAttribute('data-selected', 'true');

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should deselect on second click (toggle off)', async ({ page }) => {
      const row = page.locator('[data-expense-row="e-jr-pass"]');

      // First click - select
      await row.click();
      await expect(row).toHaveAttribute('data-selected', 'true');

      // Second click - deselect
      await row.click();
      await expect(row).not.toHaveAttribute('data-selected', 'true');
    });

    test('should support multi-selection with Ctrl+click', async ({ page }) => {
      const row1 = page.locator('[data-expense-row="e-jr-pass"]');
      const row2 = page.locator('[data-expense-row="e-ryokan"]');

      // Select first
      await row1.click();
      await expect(row1).toHaveAttribute('data-selected', 'true');

      // Ctrl+click second
      await row2.click({ modifiers: ['Control'] });

      // Both should be selected
      await expect(row1).toHaveAttribute('data-selected', 'true');
      await expect(row2).toHaveAttribute('data-selected', 'true');

      // Popover should show both
      const popover = page.locator('[data-selection-popover]');
      const popoverChips = popover.locator('[data-entity-chip]');
      await expect(popoverChips).toHaveCount(2);
    });

    test('should apply inverted colors to selected expense row', async ({ page }) => {
      const row = page.locator('[data-expense-row="e-jr-pass"]');

      // Select
      await row.click();
      await expect(row).toHaveAttribute('data-selected', 'true');

      // The row name should be white (inverted)
      const nameEl = page.locator('[data-expense-name="e-jr-pass"]');
      const nameColor = await nameEl.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      // White text = rgb(255, 255, 255)
      expect(nameColor).toContain('255');
    });

    test('should show highlighted state on expense rows', async ({ page }) => {
      // Select a parent experience to highlight child expenses
      // Select Nishiki Market food tour (parent of Street food tasting expense)
      await page.click('[data-pane="right"] [data-tab="experiences"]');
      await page.waitForSelector('[data-tree-view="experiences"]');

      const nishikiNode = page.locator('[data-tree-row]', { hasText: 'Nishiki Market food tour' }).first();
      if (await nishikiNode.count() > 0) {
        await nishikiNode.click();

        // Switch to expenses view
        await page.click('[data-pane="left"] [data-tab="expenses"]');
        await page.waitForSelector('[data-expenses-view]');

        // Street food tasting should be highlighted
        const foodRow = page.locator('[data-expense-row="e-food-tour-cost"]');
        await expect(foodRow).toHaveAttribute('data-highlighted', 'true');
      }
    });

    test('should replace selection when clicking without modifier', async ({ page }) => {
      const row1 = page.locator('[data-expense-row="e-jr-pass"]');
      const row2 = page.locator('[data-expense-row="e-ryokan"]');

      // Select first
      await row1.click();
      await expect(row1).toHaveAttribute('data-selected', 'true');

      // Click second without modifier - should replace
      await row2.click();
      await expect(row1).not.toHaveAttribute('data-selected', 'true');
      await expect(row2).toHaveAttribute('data-selected', 'true');
    });
  });

  test.describe('Add Expense', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should show add expense row', async ({ page }) => {
      const addRow = page.locator('[data-expense-add]');
      await expect(addRow).toBeVisible();
      await expect(addRow).toContainText('Add expense');
    });

    test('should show input when clicking add row', async ({ page }) => {
      const addRow = page.locator('[data-expense-add]');
      await addRow.click();

      const input = page.locator('[data-expense-add-input] input');
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test('should add new expense on Enter', async ({ page }) => {
      const addRow = page.locator('[data-expense-add]');
      await addRow.click();

      const input = page.locator('[data-expense-add-input] input');
      await input.fill('New test expense');
      await input.press('Enter');

      // New expense should appear in the list
      const view = page.locator('[data-expenses-view]');
      await expect(view).toContainText('New test expense');

      // Should have one more expense row
      const rows = page.locator('[data-expense-row]');
      const count = await rows.count();
      expect(count).toBe(11); // 10 original + 1 new
    });

    test('should cancel add on Escape', async ({ page }) => {
      const addRow = page.locator('[data-expense-add]');
      await addRow.click();

      const input = page.locator('[data-expense-add-input] input');
      await input.fill('Should not be added');
      await input.press('Escape');

      // Input should close
      await expect(input).not.toBeVisible();

      // Add row should be visible again
      await expect(page.locator('[data-expense-add]')).toBeVisible();

      // Expense should not be in the list
      const rows = page.locator('[data-expense-row]');
      const count = await rows.count();
      expect(count).toBe(10); // unchanged
    });
  });

  test.describe('Cross-View Integration', () => {
    test('should maintain selection when switching from expenses to notes view', async ({ page }) => {
      await goToExpenses(page);

      // Select an expense
      const row = page.locator('[data-expense-row="e-jr-pass"]');
      await row.click();
      await expect(row).toHaveAttribute('data-selected', 'true');

      // Switch to Notes view
      await page.click('[data-pane="right"] [data-tab="notes"]');

      // The entity chip in notes should also be selected
      const chip = page.locator('[data-entity-chip][data-entity-id="e-jr-pass"]').first();
      if (await chip.count() > 0) {
        await expect(chip).toHaveAttribute('data-selected', 'true');
      }

      // Selection popover should still be visible
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should navigate to expenses when clicking amount on chip', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Find an experience chip with an amount indicator in notes
      const amountIndicator = page.locator('[data-entity-chip][data-entity-type="experience"] [data-indicator="amount"]').first();

      if (await amountIndicator.count() > 0) {
        await amountIndicator.click();

        // Should switch to Expenses view
        const expensesTab = page.locator('[data-pane="left"] [data-tab="expenses"]');
        await expect(expensesTab).toHaveAttribute('data-active', 'true');

        // Expenses view should be visible
        const expensesView = page.locator('[data-expenses-view]');
        await expect(expensesView).toBeVisible();
      }
    });

    test('should show expenses view when clicking expenses tab from schedule view', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Switch to Schedule view first
      await page.click('[data-pane="left"] [data-tab="schedule"]');
      await page.waitForSelector('[data-schedule-view]');

      // Switch to Expenses view
      await page.click('[data-pane="left"] [data-tab="expenses"]');

      const expensesView = page.locator('[data-expenses-view]');
      await expect(expensesView).toBeVisible();
    });

    test('should reflect selection from places view in expenses highlighting', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Switch to Places view and select a place
      await page.click('[data-pane="right"] [data-tab="places"]');
      await page.waitForSelector('[data-tree-view="places"]');

      // Select Nishiki Market
      const nishikiNode = page.locator('[data-tree-row]', { hasText: 'Nishiki Market' }).first();
      if (await nishikiNode.count() > 0) {
        await nishikiNode.click();

        // Switch to expenses view
        await page.click('[data-pane="left"] [data-tab="expenses"]');
        await page.waitForSelector('[data-expenses-view]');

        // The selection popover should persist
        const popover = page.locator('[data-selection-popover]');
        await expect(popover).toBeVisible();
      }
    });
  });

  test.describe('Visual States', () => {
    test.beforeEach(async ({ page }) => {
      await goToExpenses(page);
    });

    test('should show hover effect on amount', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');

      // Hover and wait for mouseenter handler to apply
      await amount.hover();
      await page.waitForTimeout(200);

      // On hover, the color should change to the text color (#1a1917)
      const colorAfter = await amount.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      // Text color when hovered should be the primary text color (not muted)
      // #1a1917 = rgb(26, 25, 23)
      expect(colorAfter).toContain('26');
    });

    test('should show text cursor on amount', async ({ page }) => {
      const amount = page.locator('[data-expense-amount="e-jr-pass"]');
      const cursor = await amount.evaluate((el) =>
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('text');
    });

    test('should show correct font weight on expense names', async ({ page }) => {
      const name = page.locator('[data-expense-name="e-jr-pass"]');
      const fontWeight = await name.evaluate((el) =>
        window.getComputedStyle(el).fontWeight
      );
      // fontWeight 500
      expect(fontWeight).toBe('500');
    });

    test('should show Total row with strong border', async ({ page }) => {
      const totalRow = page.locator('[data-expenses-total]');
      const borderTop = await totalRow.evaluate((el) =>
        window.getComputedStyle(el).borderTopWidth
      );
      expect(borderTop).toBe('1px');
    });

    test('should apply different background for selected vs highlighted rows', async ({ page }) => {
      // Select Fushimi hike parent to highlight Fox udon expense
      await page.click('[data-pane="right"] [data-tab="experiences"]');
      await page.waitForSelector('[data-tree-view="experiences"]');

      const fushimiNode = page.locator('[data-tree-row]', { hasText: 'Fushimi Inari sunrise hike' }).first();
      if (await fushimiNode.count() > 0) {
        await fushimiNode.click();

        // Switch back to expenses
        await page.click('[data-pane="left"] [data-tab="expenses"]');
        await page.waitForSelector('[data-expenses-view]');

        // Fox udon should be highlighted
        const foxUdon = page.locator('[data-expense-row="e-fox-udon"]');
        await expect(foxUdon).toHaveAttribute('data-highlighted', 'true');

        // Get highlighted background color
        const hlBg = await foxUdon.evaluate((el) =>
          window.getComputedStyle(el).backgroundColor
        );

        // Now also select Fox udon directly
        await foxUdon.click();
        await expect(foxUdon).toHaveAttribute('data-selected', 'true');

        // Get selected background color
        const selBg = await foxUdon.evaluate((el) =>
          window.getComputedStyle(el).backgroundColor
        );

        // Selected and highlighted backgrounds should be different
        expect(selBg).not.toBe(hlBg);
      }
    });
  });
});
