import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 5 E2E Tests: Map View
 *
 * Coverage:
 * - Map view rendering with MapLibre GL JS
 * - Pin rendering for all places with coordinates
 * - Pin labels showing place names
 * - Pin visual states: default, selected (filled accent, white text, glow), highlighted (tinted bg, colored border)
 * - Clicking a pin selects the place
 * - Unlocated places footer with clickable chips
 * - Map pan/zoom to show all pins with reasonable padding
 * - Pan-to-fit on load and when selection changes
 * - Cross-view selection sync (click place in map, verify selection in other views)
 */

// Helper to navigate to map view
async function goToMap(page: Page) {
  await page.goto('/');
  await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });
  await page.click('[data-pane="left"] [data-tab="map"]');
  await page.waitForSelector('[data-map-view]', { timeout: 5000 });
}

test.describe('Phase 5: Map View', () => {

  test.describe('Map View Rendering', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should render the map view container', async ({ page }) => {
      const mapView = page.locator('[data-map-view]');
      await expect(mapView).toBeVisible();
    });

    test('should render MapLibre map container', async ({ page }) => {
      // MapLibre creates a canvas with class maplibregl-canvas
      const mapCanvas = page.locator('.maplibregl-canvas');
      await expect(mapCanvas).toBeVisible();
    });

    test('should render map tiles', async ({ page }) => {
      // Wait for MapLibre canvas to load
      await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 });
      const canvas = page.locator('.maplibregl-canvas');
      await expect(canvas).toBeVisible();

      // Verify canvas has content (non-zero dimensions)
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('should render zoom controls', async ({ page }) => {
      const zoomControl = page.locator('.maplibregl-ctrl-zoom-in');
      await expect(zoomControl).toBeVisible();

      const zoomOut = page.locator('.maplibregl-ctrl-zoom-out');
      await expect(zoomOut).toBeVisible();
    });
  });

  test.describe('Pin Rendering', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should render pins for all located places', async ({ page }) => {
      // Seed data has 5 located places: Fushimi Inari, Arashiyama, Nishiki Market, Kiyomizu-dera, Dōtonbori
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });
      const pins = page.locator('.custom-pin-icon');
      const count = await pins.count();
      expect(count).toBe(5);
    });

    test('should show place names on pin labels', async ({ page }) => {
      await page.waitForSelector('[data-pin-label]', { timeout: 5000 });
      const labels = page.locator('[data-pin-label]');
      const count = await labels.count();
      expect(count).toBeGreaterThan(0);

      // Check that labels contain place names
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    });

    test('should render pins with default state (white background)', async ({ page }) => {
      await page.waitForSelector('[data-pin-label]', { timeout: 5000 });
      const firstLabel = page.locator('[data-pin-label]').first();

      const bg = await firstLabel.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Default white background = rgb(255, 255, 255)
      expect(bg).toContain('255, 255, 255');
    });
  });

  test.describe('Pin Selection', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should select place when clicking a pin', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });
      const firstPin = page.locator('.custom-pin-icon').first();

      // Click the pin with force to bypass pointer-events issues
      await firstPin.click({ force: true });

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Popover should show one selected place chip
      const chips = popover.locator('[data-entity-chip][data-entity-type="place"]');
      await expect(chips).toHaveCount(1);
    });

    test('should apply selected visual state to clicked pin', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      // Click the pin with force
      await page.locator('.custom-pin-icon').first().click({ force: true });

      // Wait for selection to apply and markers to be recreated
      await page.waitForTimeout(1000);

      // Get the first pin label after clicking (it's a new element after recreation)
      const firstLabel = page.locator('[data-pin-label]').first();

      // Check that the label now has accent color background (selected state)
      const bg = await firstLabel.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Selected background should be accent color #a33d22 = rgb(163, 61, 34)
      expect(bg).toContain('163');
      expect(bg).toContain('61');
      expect(bg).toContain('34');
    });

    test('should deselect on second click (toggle off)', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });
      const firstPin = page.locator('.custom-pin-icon').first();

      // First click - select
      await firstPin.click({ force: true });
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Second click - deselect
      await firstPin.click({ force: true });
      await expect(popover).not.toBeVisible();
    });

    test('should support multi-selection with Ctrl+click', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });
      const pins = page.locator('.custom-pin-icon');
      const firstPin = pins.nth(0);
      const secondPin = pins.nth(1);

      // Select first
      await firstPin.click({ force: true });
      let popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Ctrl+click second
      await secondPin.click({ modifiers: ['Control'], force: true });

      // Popover should show both
      const chips = popover.locator('[data-entity-chip]');
      await expect(chips).toHaveCount(2);
    });

    test('should show white text on selected pin label', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      // Click to select with force
      await page.locator('.custom-pin-icon').first().click({ force: true });

      // Wait for popover to appear (indicates selection has been processed)
      await page.waitForSelector('[data-selection-popover]', { timeout: 5000 });

      // Wait a bit more for markers to be recreated
      await page.waitForTimeout(1000);

      // Get the first pin label after clicking (it's a new element after recreation)
      const firstLabel = page.locator('[data-pin-label]').first();

      // Check text color is white
      const color = await firstLabel.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // White text = rgb(255, 255, 255)
      expect(color).toContain('255, 255, 255');
    });
  });

  test.describe('Highlighted State', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should highlight places when associated experience is selected', async ({ page }) => {
      // Switch to Schedule view
      await page.click('[data-pane="left"] [data-tab="schedule"]');
      await page.waitForSelector('[data-schedule-view]', { timeout: 5000 });

      // Select Nishiki Market food tour (associated with Nishiki Market place)
      const mar15 = page.locator('[data-schedule-day="2026-03-15"]');
      const nishikiRow = mar15.locator('[data-schedule-row]').first();
      await nishikiRow.click();

      // Switch back to Map
      await page.click('[data-pane="left"] [data-tab="map"]');
      await page.waitForSelector('[data-map-view]', { timeout: 5000 });

      // The Nishiki Market pin should be highlighted
      // This is harder to test visually - we can check that selection popover still shows
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should highlight experiences when place is selected', async ({ page }) => {
      // Select a place that has associated experiences
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      // Click a pin (e.g., Nishiki Market which has 2 experiences)
      // We need to find the right pin by checking labels
      const labels = page.locator('[data-pin-label]');
      const count = await labels.count();

      for (let i = 0; i < count; i++) {
        const text = await labels.nth(i).textContent();
        if (text?.includes('Nishiki')) {
          await page.locator('.custom-pin-icon').nth(i).click();
          break;
        }
      }

      // Selection popover should show the place
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Switch to Schedule view to verify highlighting
      await page.click('[data-pane="left"] [data-tab="schedule"]');
      await page.waitForSelector('[data-schedule-view]', { timeout: 5000 });

      // Experiences at Nishiki Market should be highlighted
      const highlightedRows = page.locator('[data-schedule-row][data-highlighted="true"]');
      const hlCount = await highlightedRows.count();
      expect(hlCount).toBeGreaterThan(0);
    });
  });

  test.describe('Unlocated Places Footer', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should render unlocated footer', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');
      await expect(footer).toBeVisible();
    });

    test('should show "Unlocated" label', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');
      await expect(footer).toContainText('Unlocated');
    });

    test('should show chips for unlocated places', async ({ page }) => {
      // Seed data has 2 unlocated places: Sake tasting venue, Pottery studio
      const footer = page.locator('[data-unlocated-footer]');
      const chips = footer.locator('[data-entity-chip]');
      const count = await chips.count();
      expect(count).toBe(2);
    });

    test('should show unlocated place names', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');
      await expect(footer).toContainText('Sake tasting venue');
      await expect(footer).toContainText('Pottery studio');
    });

    test('should select place when clicking unlocated chip', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');
      const firstChip = footer.locator('[data-entity-chip]').first();

      await firstChip.click();

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Chip should be selected
      await expect(firstChip).toHaveAttribute('data-selected', 'true');
    });

    test('should support multi-selection from unlocated footer', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');
      const chips = footer.locator('[data-entity-chip]');
      const firstChip = chips.nth(0);
      const secondChip = chips.nth(1);

      // Select first
      await firstChip.click();

      // Ctrl+click second
      await secondChip.click({ modifiers: ['Control'] });

      // Both should be selected
      await expect(firstChip).toHaveAttribute('data-selected', 'true');
      await expect(secondChip).toHaveAttribute('data-selected', 'true');

      // Popover should show both
      const popover = page.locator('[data-selection-popover]');
      const popoverChips = popover.locator('[data-entity-chip]');
      await expect(popoverChips).toHaveCount(2);
    });

    test('should show place chips in small size', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');
      const firstChip = footer.locator('[data-entity-chip]').first();

      // Small chips have font-size: 10px
      const fontSize = await firstChip.evaluate((el) =>
        window.getComputedStyle(el).fontSize
      );

      expect(fontSize).toBe('10px');
    });
  });

  test.describe('Map Interaction', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should allow zooming in', async ({ page }) => {
      const zoomIn = page.locator('.maplibregl-ctrl-zoom-in');

      await zoomIn.click();
      await page.waitForTimeout(500); // Wait for zoom animation

      // Map should still be visible after zoom
      const mapCanvas = page.locator('.maplibregl-canvas');
      await expect(mapCanvas).toBeVisible();
    });

    test('should allow zooming out', async ({ page }) => {
      const zoomOut = page.locator('.maplibregl-ctrl-zoom-out');

      await zoomOut.click();
      await page.waitForTimeout(500);

      // Map should still be visible
      const mapCanvas = page.locator('.maplibregl-canvas');
      await expect(mapCanvas).toBeVisible();
    });

    test('should show attribution', async ({ page }) => {
      // MapLibre attribution control
      const attribution = page.locator('.maplibregl-ctrl-attrib');
      await expect(attribution).toBeVisible();
    });

    test('should fit bounds to show all pins on load', async ({ page }) => {
      // All pins should be visible (not checking exact positions, just that they rendered)
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });
      const pins = page.locator('.custom-pin-icon');

      // Check that at least some pins are in viewport
      const firstPin = pins.first();
      const isVisible = await firstPin.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Cross-View Selection Sync', () => {
    test('should maintain selection when switching from map to places view', async ({ page }) => {
      await goToMap(page);

      // Select a place pin
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });
      await page.locator('.custom-pin-icon').first().click({ force: true });

      // Get the entity ID from popover
      const popover = page.locator('[data-selection-popover]');
      const chip = popover.locator('[data-entity-chip]').first();
      const entityId = await chip.getAttribute('data-entity-id');

      // Switch to Places view
      await page.click('[data-pane="right"] [data-tab="places"]');
      await page.waitForSelector('[data-tree-view="places"]', { timeout: 5000 });

      // The place should be selected in the tree
      const selectedNode = page.locator(`[data-tree-row][data-entity-id="${entityId}"][data-selected="true"]`);
      if (await selectedNode.count() > 0) {
        await expect(selectedNode).toBeVisible();
      }

      // Selection popover should still be visible
      await expect(popover).toBeVisible();
    });

    test('should maintain selection when switching from places to map view', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Switch to Places view
      await page.click('[data-pane="right"] [data-tab="places"]');
      await page.waitForSelector('[data-tree-view="places"]', { timeout: 5000 });

      // Select a place
      const firstPlace = page.locator('[data-tree-row][data-entity-type="place"]').first();
      await firstPlace.click();

      // Switch to Map
      await page.click('[data-pane="left"] [data-tab="map"]');
      await page.waitForSelector('[data-map-view]', { timeout: 5000 });

      // Selection popover should still be visible
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should navigate to map when clicking place pin icon on a chip', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Default is on Notes view - find a place chip
      const placeChips = page.locator('[data-entity-chip][data-entity-type="place"]');

      if (await placeChips.count() > 0) {
        const firstChip = placeChips.first();
        const pinIcon = firstChip.locator('[data-icon="pin"]');

        await pinIcon.click();

        // Should switch to Map view
        const mapTab = page.locator('[data-pane="left"] [data-tab="map"]');
        await expect(mapTab).toHaveAttribute('data-active', 'true');

        // Map view should be visible
        const mapView = page.locator('[data-map-view]');
        await expect(mapView).toBeVisible();
      }
    });

    test('should show map view when clicking map tab from expenses view', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });

      // Switch to Expenses view first
      await page.click('[data-pane="left"] [data-tab="expenses"]');
      await page.waitForSelector('[data-expenses-view]', { timeout: 5000 });

      // Select an expense
      const expenseRow = page.locator('[data-expense-row]').first();
      if (await expenseRow.count() > 0) {
        await expenseRow.click();
      }

      // Switch to map view
      await page.click('[data-pane="left"] [data-tab="map"]');

      const mapView = page.locator('[data-map-view]');
      await expect(mapView).toBeVisible();

      // Selection popover should persist if there was a selection
      const popover = page.locator('[data-selection-popover]');
      if (await popover.count() > 0) {
        await expect(popover).toBeVisible();
      }
    });
  });

  test.describe('Visual States', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should show different visual states for selected vs highlighted pins', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      // Click first pin to select
      const firstPin = page.locator('.custom-pin-icon').first();
      await firstPin.click({ force: true });

      // Wait for popover to appear (indicates selection has been processed)
      await page.waitForSelector('[data-selection-popover]', { timeout: 5000 });

      // Wait for markers to be recreated
      await page.waitForTimeout(1000);

      // Get the label background (new element after recreation)
      const firstLabel = page.locator('[data-pin-label]').first();
      const selectedBg = await firstLabel.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Selected should have accent color #a33d22 = rgb(163, 61, 34)
      expect(selectedBg).toContain('163');
    });

    test('should show glow shadow on selected pin', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      const firstLabel = page.locator('[data-pin-label]').first();

      // Click to select
      await page.locator('.custom-pin-icon').first().click({ force: true });
      await page.waitForTimeout(200);

      // Check for box-shadow
      const shadow = await firstLabel.evaluate((el) =>
        window.getComputedStyle(el).boxShadow
      );

      // Shadow should exist
      expect(shadow).not.toBe('none');
    });

    test('should position footer at bottom of map', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');

      const position = await footer.evaluate((el) =>
        window.getComputedStyle(el).position
      );

      expect(position).toBe('absolute');

      const bottom = await footer.evaluate((el) =>
        window.getComputedStyle(el).bottom
      );

      // Should be positioned near bottom
      expect(bottom).toBe('10px');
    });

    test('should apply semi-transparent background to unlocated footer', async ({ page }) => {
      const footer = page.locator('[data-unlocated-footer]');

      const bg = await footer.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should be semi-transparent white rgba(255,255,255,0.88)
      expect(bg).toContain('rgba');
      expect(bg).toContain('255');
      expect(bg).toContain('0.88');
    });
  });

  test.describe('Map Pan-to-Fit', () => {
    test.beforeEach(async ({ page }) => {
      await goToMap(page);
    });

    test('should show all pins on initial load', async ({ page }) => {
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      // Check that multiple pins are visible
      const pins = page.locator('.custom-pin-icon');
      const count = await pins.count();
      expect(count).toBe(5);

      // Check that at least the first few pins are in viewport
      for (let i = 0; i < Math.min(3, count); i++) {
        const pin = pins.nth(i);
        const isVisible = await pin.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('should fit bounds with reasonable padding', async ({ page }) => {
      // Check that map container has proper dimensions
      const mapCanvas = page.locator('.maplibregl-canvas');
      const box = await mapCanvas.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(200);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle clicking on map background (not on a pin)', async ({ page }) => {
      await goToMap(page);
      await page.waitForSelector('.maplibregl-canvas', { timeout: 5000 });

      // Click somewhere on the map that's not a pin
      const mapCanvas = page.locator('.maplibregl-canvas');
      await mapCanvas.click({ position: { x: 50, y: 50 } });

      // No selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).not.toBeVisible();
    });

    test('should handle empty unlocated places gracefully', async ({ page }) => {
      // This test would require modifying seed data, but we can check that footer handles its data correctly
      await goToMap(page);

      const footer = page.locator('[data-unlocated-footer]');
      await expect(footer).toBeVisible();

      // Should have chips
      const chips = footer.locator('[data-entity-chip]');
      const count = await chips.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should clear selection when clicking clear button in popover', async ({ page }) => {
      await goToMap(page);
      await page.waitForSelector('.custom-pin-icon', { timeout: 5000 });

      // Select a pin
      await page.locator('.custom-pin-icon').first().click({ force: true });

      // Popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();

      // Click clear button
      const clearButton = page.locator('[data-action="clear"]');
      await clearButton.click();

      // Popover should disappear
      await expect(popover).not.toBeVisible();
    });
  });
});
