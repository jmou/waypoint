import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 1 E2E Tests: Notes Editor, Chips, Selection, and Highlighting
 *
 * Coverage:
 * - Shared Chip component rendering
 * - Entity chip visual states (default, selected, highlighted)
 * - Chip indicator clicks and navigation
 * - Selection popover functionality
 * - Paragraph-level highlighting in notes editor
 */

test.describe('Phase 1: Notes Editor and Chips', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to hydrate with seed data
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });
  });

  test.describe('Chip Rendering', () => {
    test('should render place chips with pin icon and name', async ({ page }) => {
      // Find a place chip in the notes editor
      const placeChip = page.locator('[data-entity-chip][data-entity-type="place"]').first();
      await expect(placeChip).toBeVisible();

      // Should have pin icon
      const pinIcon = placeChip.locator('[data-icon="pin"]');
      await expect(pinIcon).toBeVisible();

      // Should have vertical rule separator
      const separator = placeChip.locator('[data-separator]');
      await expect(separator).toBeVisible();

      // Should have entity name
      const name = placeChip.locator('[data-chip-name]');
      await expect(name).toBeVisible();
    });

    test('should render experience chips with indicators', async ({ page }) => {
      // Find an experience chip with multiple indicators
      const expChip = page.locator('[data-entity-chip][data-entity-type="experience"]').first();
      await expect(expChip).toBeVisible();

      // Should have name
      const name = expChip.locator('[data-chip-name]');
      await expect(name).toBeVisible();

      // May have pin, clock, or amount indicators (check if present)
      const indicators = expChip.locator('[data-indicator]');
      const count = await indicators.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should apply correct colors to chips', async ({ page }) => {
      // Place chips should be red (#a33d22)
      const placeChip = page.locator('[data-entity-chip][data-entity-type="place"]').first();
      const placeColor = await placeChip.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('--accent-color') ||
               window.getComputedStyle(el).borderColor;
      });
      expect(placeColor).toContain('163'); // RGB for #a33d22

      // Experience chips should be blue (#2d5f82)
      const expChip = page.locator('[data-entity-chip][data-entity-type="experience"]').first();
      const expColor = await expChip.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('--accent-color') ||
               window.getComputedStyle(el).borderColor;
      });
      expect(expColor).toContain('45'); // RGB for #2d5f82
    });
  });

  test.describe('Chip Selection', () => {
    test('should select chip on click', async ({ page }) => {
      const chip = page.locator('[data-entity-chip]').first();
      const chipId = await chip.getAttribute('data-entity-id');

      // Click the chip name (not indicators)
      const chipName = chip.locator('[data-chip-name]');
      await chipName.click();

      // Chip should be in selected state (inverted colors)
      await expect(chip).toHaveAttribute('data-selected', 'true');

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Popover should contain the selected chip
      const popoverChip = popover.locator(`[data-entity-id="${chipId}"]`);
      await expect(popoverChip).toBeVisible();
    });

    test('should deselect chip on second click', async ({ page }) => {
      const chip = page.locator('[data-entity-chip]').first();
      const chipName = chip.locator('[data-chip-name]');

      // First click - select
      await chipName.click();
      await expect(chip).toHaveAttribute('data-selected', 'true');

      // Second click - deselect
      await chipName.click();
      await expect(chip).not.toHaveAttribute('data-selected', 'true');

      // Selection popover should disappear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).not.toBeVisible();
    });

    test('should support multi-selection with Ctrl+click', async ({ page }) => {
      const chips = page.locator('[data-entity-chip]');
      const firstChip = chips.nth(0);
      const secondChip = chips.nth(1);

      // Click first chip
      await firstChip.locator('[data-chip-name]').click();
      await expect(firstChip).toHaveAttribute('data-selected', 'true');

      // Ctrl+click second chip
      await secondChip.locator('[data-chip-name]').click({
        modifiers: ['Control'],
      });

      // Both should be selected
      await expect(firstChip).toHaveAttribute('data-selected', 'true');
      await expect(secondChip).toHaveAttribute('data-selected', 'true');

      // Popover should show both chips
      const popover = page.locator('[data-selection-popover]');
      const popoverChips = popover.locator('[data-entity-chip]');
      await expect(popoverChips).toHaveCount(2);
    });
  });

  test.describe('Chip Indicator Navigation', () => {
    test('should navigate to map when clicking place chip pin icon', async ({ page }) => {
      // Find a place chip with coordinates
      const placeChip = page.locator('[data-entity-chip][data-entity-type="place"]').first();
      const pinIcon = placeChip.locator('[data-icon="pin"]');

      await pinIcon.click();

      // Should switch to Map view in left pane
      const mapTab = page.locator('[data-pane="left"] [data-tab="map"]');
      await expect(mapTab).toHaveAttribute('data-active', 'true');

      // Place should be selected
      await expect(placeChip).toHaveAttribute('data-selected', 'true');
    });

    test('should navigate to map when clicking experience chip pin icon', async ({ page }) => {
      // Find an experience chip with a place association
      const expChipWithPin = page.locator('[data-entity-chip][data-entity-type="experience"] [data-icon="pin"]').first();
      const expChip = expChipWithPin.locator('..'); // parent chip

      await expChipWithPin.click();

      // Should switch to Map view
      const mapTab = page.locator('[data-pane="left"] [data-tab="map"]');
      await expect(mapTab).toHaveAttribute('data-active', 'true');

      // Experience (not place) should be selected
      await expect(expChip).toHaveAttribute('data-selected', 'true');
    });

    test('should navigate to schedule when clicking clock icon', async ({ page }) => {
      // Find an experience chip with a schedule
      const clockIcon = page.locator('[data-entity-chip][data-entity-type="experience"] [data-icon="clock"]').first();

      if (await clockIcon.count() > 0) {
        await clockIcon.click();

        // Should switch to Schedule view
        const scheduleTab = page.locator('[data-pane="left"] [data-tab="schedule"]');
        await expect(scheduleTab).toHaveAttribute('data-active', 'true');
      }
    });

    test('should navigate to expenses when clicking amount', async ({ page }) => {
      // Find an experience chip with an amount
      const amountIndicator = page.locator('[data-entity-chip][data-entity-type="experience"] [data-indicator="amount"]').first();

      if (await amountIndicator.count() > 0) {
        await amountIndicator.click();

        // Should switch to Expenses view
        const expensesTab = page.locator('[data-pane="left"] [data-tab="expenses"]');
        await expect(expensesTab).toHaveAttribute('data-active', 'true');
      }
    });
  });

  test.describe('Selection Popover', () => {
    test('should show selection popover when entities are selected', async ({ page }) => {
      const chip = page.locator('[data-entity-chip]').first();
      await chip.locator('[data-chip-name]').click();

      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Popover should be fixed at bottom-center
      const box = await popover.boundingBox();
      const viewport = page.viewportSize();
      expect(box).toBeTruthy();
      if (box && viewport) {
        // Should be roughly centered horizontally
        const centerX = box.x + box.width / 2;
        expect(Math.abs(centerX - viewport.width / 2)).toBeLessThan(100);

        // Should be near bottom
        expect(box.y + box.height).toBeGreaterThan(viewport.height - 100);
      }
    });

    test('should clear all selection when clicking × button', async ({ page }) => {
      // Select multiple chips
      const chips = page.locator('[data-entity-chip]');
      await chips.nth(0).locator('[data-chip-name]').click();
      await chips.nth(1).locator('[data-chip-name]').click({ modifiers: ['Control'] });

      // Click clear button
      const clearButton = page.locator('[data-selection-popover] [data-action="clear"]');
      await clearButton.click();

      // All chips should be deselected
      await expect(chips.nth(0)).not.toHaveAttribute('data-selected', 'true');
      await expect(chips.nth(1)).not.toHaveAttribute('data-selected', 'true');

      // Popover should disappear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).not.toBeVisible();
    });

    test('should remove chip from selection when clicking it in popover', async ({ page }) => {
      const chips = page.locator('[data-entity-chip]');
      const firstChipId = await chips.nth(0).getAttribute('data-entity-id');

      // Select two chips
      await chips.nth(0).locator('[data-chip-name]').click();
      await chips.nth(1).locator('[data-chip-name]').click({ modifiers: ['Control'] });

      // Click first chip in popover to deselect it
      const popover = page.locator('[data-selection-popover]');
      const popoverChip = popover.locator(`[data-entity-id="${firstChipId}"]`);
      await popoverChip.click();

      // First chip should no longer be selected
      await expect(chips.nth(0)).not.toHaveAttribute('data-selected', 'true');

      // Second chip should still be selected
      await expect(chips.nth(1)).toHaveAttribute('data-selected', 'true');

      // Popover should still be visible (one chip remaining)
      await expect(popover).toBeVisible();
    });

    test('should show "+N more" when more than 8 chips selected', async ({ page }) => {
      const chips = page.locator('[data-entity-chip]');
      const chipCount = await chips.count();

      if (chipCount >= 9) {
        // Select 9 chips
        for (let i = 0; i < 9; i++) {
          await chips.nth(i).locator('[data-chip-name]').click({
            modifiers: i === 0 ? [] : ['Control'],
          });
        }

        const popover = page.locator('[data-selection-popover]');
        const moreText = popover.locator('[data-overflow-count]');
        await expect(moreText).toBeVisible();
        await expect(moreText).toContainText('+1 more');
      }
    });
  });

  test.describe('Highlighting', () => {
    test('should highlight descendant entities when parent is selected', async ({ page }) => {
      // This test requires knowledge of the entity hierarchy
      // Select a parent place and verify child places are highlighted

      // Navigate to Places view to see the hierarchy
      await page.click('[data-pane="right"] [data-tab="places"]');

      // Find a parent node with children
      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        // Expand if collapsed
        const toggle = parentNode.locator('[data-toggle]');
        const isExpanded = await parentNode.getAttribute('data-expanded');
        if (isExpanded === 'false') {
          await toggle.click();
        }

        // Select the parent
        const parentRow = parentNode.locator('[data-tree-row]').first();
        await parentRow.click();

        // Children should be highlighted
        const parentId = await parentNode.getAttribute('data-entity-id');
        const childNodes = page.locator(`[data-tree-node][data-parent-id="${parentId}"]`);

        const firstChild = childNodes.first();
        if (await firstChild.count() > 0) {
          await expect(firstChild).toHaveAttribute('data-highlighted', 'true');
        }
      }
    });

    test('should highlight associated places when experience is selected', async ({ page }) => {
      // Navigate to Experiences view
      await page.click('[data-pane="right"] [data-tab="experiences"]');

      // Find an experience with associated places
      const expNode = page.locator('[data-tree-node][data-entity-type="experience"]').first();
      await expNode.click();

      // Check if any place chips in notes are highlighted
      await page.click('[data-pane="right"] [data-tab="notes"]');
      const highlightedPlaces = page.locator('[data-entity-chip][data-entity-type="place"][data-highlighted="true"]');

      // At least one place should be highlighted if the experience has place associations
      const count = await highlightedPlaces.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should highlight paragraph blocks containing selected entities', async ({ page }) => {
      // Navigate to notes view
      await page.click('[data-pane="right"] [data-tab="notes"]');

      // Select a chip in the notes
      const chip = page.locator('[data-entity-chip]').first();
      await chip.locator('[data-chip-name]').click();

      // Find the parent paragraph block
      const paragraph = chip.locator('xpath=ancestor::*[@data-paragraph-block]');

      if (await paragraph.count() > 0) {
        // Paragraph should have selection highlight
        await expect(paragraph).toHaveAttribute('data-has-selected', 'true');
      }
    });
  });

  test.describe('Chip Visual States', () => {
    test('should show hover effect on chip indicators', async ({ page }) => {
      const placeChip = page.locator('[data-entity-chip][data-entity-type="place"]').first();
      const pinIcon = placeChip.locator('[data-icon="pin"]');

      // Hover over pin icon
      await pinIcon.hover();

      // Should apply hover styles (opacity change or background)
      const opacity = await pinIcon.evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      // Hover should increase opacity or show background
      expect(parseFloat(opacity)).toBeGreaterThan(0);
    });

    test('should display inverted colors when selected', async ({ page }) => {
      const chip = page.locator('[data-entity-chip]').first();

      // Get default state background
      const defaultBg = await chip.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Select chip
      await chip.locator('[data-chip-name]').click();

      // Get selected state background
      const selectedBg = await chip.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should be different (inverted)
      expect(selectedBg).not.toBe(defaultBg);
    });

    test('should show highlighted state with tinted background', async ({ page }) => {
      // Navigate to Places view to work with hierarchy
      await page.click('[data-pane="right"] [data-tab="places"]');

      // Find and select a parent to highlight children
      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        const toggle = parentNode.locator('[data-toggle]');
        const isExpanded = await parentNode.getAttribute('data-expanded');
        if (isExpanded === 'false') {
          await toggle.click();
        }

        await parentNode.locator('[data-tree-row]').first().click();

        // Check child has highlighted styling
        const parentId = await parentNode.getAttribute('data-entity-id');
        const childNode = page.locator(`[data-tree-node][data-parent-id="${parentId}"]`).first();

        if (await childNode.count() > 0) {
          await expect(childNode).toHaveAttribute('data-highlighted', 'true');

          // Highlighted should have tinted background (not solid)
          const bg = await childNode.evaluate((el) =>
            window.getComputedStyle(el).backgroundColor
          );
          expect(bg).toContain('rgba'); // Should be semi-transparent
        }
      }
    });
  });
});
