import { test, expect } from '@playwright/test';

/**
 * Phase 6 Basic Tests
 *
 * These tests run regardless of whether PartyKit is enabled,
 * validating that the app still works in local-only mode.
 */

test.describe('Phase 6: Basic Functionality (Local Mode)', () => {
  test('should load without PartyKit', async ({ page }) => {
    await page.goto('/');

    // App should load successfully
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

    // Check that the app is functional
    const editor = page.locator('.waypoint-notes-editor');
    await expect(editor).toBeVisible();

    // Should show title
    const titlebar = page.locator('.titlebar__name');
    await expect(titlebar).toContainText('Kyoto');
  });

  test('should allow entity creation in local mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

    // Open Places view
    await page.click('[data-pane="right"] [data-tab="places"]');
    await page.waitForSelector('[data-tree-view="places"]');

    // Add a new place
    const addRow = page.locator('[data-tree-add]').first();
    await addRow.click();

    const input = page.locator('[data-tree-add-input] input').first();
    await input.fill('Local Mode Test Place');
    await input.press('Enter');

    // Should appear in the list
    const view = page.locator('[data-tree-view="places"]');
    await expect(view).toContainText('Local Mode Test Place');
  });

  test('should allow editing in local mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

    // Open Expenses view
    await page.click('[data-pane="left"] [data-tab="expenses"]');
    await page.waitForSelector('[data-expenses-view]');

    // Edit an amount
    const amount = page.locator('[data-expense-amount="e-fox-udon"]');
    await amount.click();

    const input = page.locator('[data-amount-input="e-fox-udon"]');
    await input.fill('2000');
    await input.press('Enter');

    // Should show updated value
    const updatedAmount = page.locator('[data-expense-amount="e-fox-udon"]');
    await expect(updatedAmount).toContainText('¥2,000');
  });

  test('should support selection in local mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

    // Click an entity chip
    const chip = page.locator('[data-entity-chip]').first();
    await chip.click();

    // Selection popover should appear
    const popover = page.locator('[data-selection-popover]');
    await expect(popover).toBeVisible();

    // Should show the selected chip
    const popoverChip = popover.locator('[data-entity-chip]');
    await expect(popoverChip).toHaveCount(1);
  });

  test('should support notes editing in local mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

    // Editor should be visible
    const editor = page.locator('.waypoint-notes-editor');
    await expect(editor).toBeVisible();

    // Click and type
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Local mode test.');

    // Text should appear
    await expect(editor).toContainText('Local mode test.');
  });
});

test.describe('Phase 6: PartyKit Detection', () => {
  test('should detect PartyKit configuration', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

    // Check if PARTYKIT_ENABLED is set by looking for collaboration features
    // If PartyKit is enabled, there should be a room connection
    // This is just a basic smoke test to verify the flag works

    const hasPartyKit = !!process.env.VITE_PARTYKIT_HOST;

    if (hasPartyKit) {
      // Should not throw errors
      await page.waitForTimeout(2000);

      // Check console for errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.waitForTimeout(1000);

      // Should have no critical errors
      const criticalErrors = errors.filter(e =>
        e.includes('PartyKit') || e.includes('authentication')
      );
      expect(criticalErrors.length).toBe(0);
    }
  });
});
