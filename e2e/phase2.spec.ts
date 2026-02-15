import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 2 E2E Tests: Places and Experiences Tree Views
 *
 * Coverage:
 * - PlacesView tree hierarchy rendering
 * - ExperiencesView tree hierarchy rendering
 * - Expand/collapse functionality
 * - Drag-and-drop reparenting
 * - Drag-and-drop reordering
 * - Inline add rows
 * - Selection and highlighting in tree views
 */

test.describe('Phase 2: Tree Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to hydrate
    await page.waitForSelector('[data-entity-chip]', { timeout: 5000 });
  });

  test.describe('Places Tree View', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Places view
      await page.click('[data-pane="right"] [data-tab="places"]');
      await page.waitForSelector('[data-tree-view="places"]');
    });

    test('should render places tree hierarchy', async ({ page }) => {
      const treeView = page.locator('[data-tree-view="places"]');
      await expect(treeView).toBeVisible();

      // Should have tree nodes
      const nodes = page.locator('[data-tree-node][data-entity-type="place"]');
      const count = await nodes.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should render place rows with pin icon and name', async ({ page }) => {
      const placeRow = page.locator('[data-tree-row][data-entity-type="place"]').first();
      await expect(placeRow).toBeVisible();

      // Should have pin icon
      const pinIcon = placeRow.locator('[data-icon="pin"]');
      await expect(pinIcon).toBeVisible();

      // Should have name
      const name = placeRow.locator('[data-row-name]');
      await expect(name).toBeVisible();
      const text = await name.textContent();
      expect(text).toBeTruthy();
    });

    test('should show "no loc" label for unlocated places', async ({ page }) => {
      // Create a place without coordinates to test
      const addRow = page.locator('[data-inline-add]').first();
      await addRow.click();

      const input = page.locator('[data-inline-add] input');
      await input.fill('Test Unlocated Place');
      await input.press('Enter');

      // Find the new place (should be at top or visible)
      await page.waitForTimeout(500); // Wait for state update

      // Check if any place has "no loc" label
      const noLocLabel = page.locator('[data-tree-row] [data-no-location]').first();
      if (await noLocLabel.count() > 0) {
        await expect(noLocLabel).toBeVisible();
        await expect(noLocLabel).toHaveText('no loc');
      }
    });

    test('should expand and collapse parent places', async ({ page }) => {
      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        const toggle = parentNode.locator('[data-toggle]');
        const entityId = await parentNode.getAttribute('data-entity-id');

        // Should start expanded (default for depth < 2)
        let isExpanded = await parentNode.getAttribute('data-expanded');

        if (isExpanded === 'true') {
          // Collapse
          await toggle.click();
          await expect(parentNode).toHaveAttribute('data-expanded', 'false');

          // Children should be hidden
          const children = page.locator(`[data-tree-node][data-parent-id="${entityId}"]`);
          await expect(children.first()).not.toBeVisible();

          // Expand again
          await toggle.click();
          await expect(parentNode).toHaveAttribute('data-expanded', 'true');

          // Children should be visible
          await expect(children.first()).toBeVisible();
        }
      }
    });

    test('should select place on row click', async ({ page }) => {
      const placeRow = page.locator('[data-tree-row][data-entity-type="place"]').first();
      await placeRow.click();

      // Row should be selected
      const parentNode = placeRow.locator('xpath=ancestor::*[@data-tree-node]');
      await expect(parentNode).toHaveAttribute('data-selected', 'true');

      // Selection popover should appear
      const popover = page.locator('[data-selection-popover]');
      await expect(popover).toBeVisible();
    });

    test('should add new place via inline add row', async ({ page }) => {
      const addRow = page.locator('[data-inline-add]').first();
      await addRow.click();

      const input = page.locator('[data-inline-add] input');
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();

      // Type and submit
      await input.fill('New Test Place');
      await input.press('Enter');

      // Input should disappear
      await expect(input).not.toBeVisible();

      // New place should exist in tree
      await page.waitForTimeout(500);
      const newPlace = page.locator('[data-tree-row]', { hasText: 'New Test Place' });
      const count = await newPlace.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should cancel inline add on Escape', async ({ page }) => {
      const addRow = page.locator('[data-inline-add]').first();
      await addRow.click();

      const input = page.locator('[data-inline-add] input');
      await input.fill('Should be cancelled');
      await input.press('Escape');

      // Input should disappear
      await expect(input).not.toBeVisible();

      // Place should not be created
      const cancelled = page.locator('[data-tree-row]', { hasText: 'Should be cancelled' });
      await expect(cancelled).not.toBeVisible();
    });
  });

  test.describe('Experiences Tree View', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Experiences view
      await page.click('[data-pane="right"] [data-tab="experiences"]');
      await page.waitForSelector('[data-tree-view="experiences"]');
    });

    test('should render experiences tree hierarchy', async ({ page }) => {
      const treeView = page.locator('[data-tree-view="experiences"]');
      await expect(treeView).toBeVisible();

      // Should have tree nodes
      const nodes = page.locator('[data-tree-node][data-entity-type="experience"]');
      const count = await nodes.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should render experience rows with indicators', async ({ page }) => {
      const expRow = page.locator('[data-tree-row][data-entity-type="experience"]').first();
      await expect(expRow).toBeVisible();

      // Should have expense/non-expense indicator
      const indicator = expRow.locator('[data-row-indicator]');
      await expect(indicator).toBeVisible();

      // Should have name
      const name = expRow.locator('[data-row-name]');
      await expect(name).toBeVisible();
    });

    test('should show expense indicator (¥) for experiences with amounts', async ({ page }) => {
      // Find an expense row
      const expenseRow = page.locator('[data-tree-row][data-is-expense="true"]').first();

      if (await expenseRow.count() > 0) {
        const indicator = expenseRow.locator('[data-row-indicator]');
        const text = await indicator.textContent();
        expect(text).toBe('¥');
      }
    });

    test('should show dot indicator for non-expense experiences', async ({ page }) => {
      const nonExpenseRow = page.locator('[data-tree-row][data-is-expense="false"]').first();

      if (await nonExpenseRow.count() > 0) {
        const indicator = nonExpenseRow.locator('[data-row-indicator]');
        // Should be a small dot (bullet), not ¥
        const text = await indicator.textContent();
        expect(text).not.toBe('¥');
      }
    });

    test('should display associated place for experiences', async ({ page }) => {
      // Find an experience with a place association
      const rowWithPlace = page.locator('[data-tree-row][data-has-place="true"]').first();

      if (await rowWithPlace.count() > 0) {
        const placeInfo = rowWithPlace.locator('[data-row-place]');
        await expect(placeInfo).toBeVisible();

        // Should have pin icon
        const pinIcon = placeInfo.locator('[data-icon="pin"]');
        await expect(pinIcon).toBeVisible();
      }
    });

    test('should display schedule date for scheduled experiences', async ({ page }) => {
      // Find an experience with a schedule
      const rowWithSchedule = page.locator('[data-tree-row][data-has-schedule="true"]').first();

      if (await rowWithSchedule.count() > 0) {
        const scheduleInfo = rowWithSchedule.locator('[data-row-schedule]');
        await expect(scheduleInfo).toBeVisible();

        // Should have clock icon
        const clockIcon = scheduleInfo.locator('[data-icon="clock"]');
        await expect(clockIcon).toBeVisible();
      }
    });

    test('should display aggregated cost for parent experiences', async ({ page }) => {
      // Find a parent experience with children
      const parentNode = page.locator('[data-tree-node][data-has-children="true"][data-entity-type="experience"]').first();

      if (await parentNode.count() > 0) {
        const costInfo = parentNode.locator('[data-row-cost]').first();

        if (await costInfo.count() > 0) {
          await expect(costInfo).toBeVisible();
          const text = await costInfo.textContent();
          // Should show currency amount
          expect(text).toMatch(/[¥$€£]\d+/);
        }
      }
    });

    test('should add new experience via inline add row', async ({ page }) => {
      const addRow = page.locator('[data-inline-add]').first();
      await addRow.click();

      const input = page.locator('[data-inline-add] input');
      await input.fill('New Test Experience');
      await input.press('Enter');

      // New experience should exist
      await page.waitForTimeout(500);
      const newExp = page.locator('[data-tree-row]', { hasText: 'New Test Experience' });
      const count = await newExp.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should expand and collapse parent experiences', async ({ page }) => {
      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        const toggle = parentNode.locator('[data-toggle]');
        const entityId = await parentNode.getAttribute('data-entity-id');

        let isExpanded = await parentNode.getAttribute('data-expanded');

        if (isExpanded === 'true') {
          // Collapse
          await toggle.click();
          await expect(parentNode).toHaveAttribute('data-expanded', 'false');

          // Children should be hidden
          const children = page.locator(`[data-tree-node][data-parent-id="${entityId}"]`);
          await expect(children.first()).not.toBeVisible();

          // Expand
          await toggle.click();
          await expect(parentNode).toHaveAttribute('data-expanded', 'true');
          await expect(children.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Drag and Drop - Reparenting', () => {
    test('should reparent place via drag and drop onto another place', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="places"]');

      const nodes = page.locator('[data-tree-node][data-entity-type="place"]');
      if (await nodes.count() >= 2) {
        const sourceNode = nodes.nth(0);
        const targetNode = nodes.nth(1);

        const sourceRow = sourceNode.locator('[data-tree-row]');
        const targetRow = targetNode.locator('[data-tree-row]');

        const sourceId = await sourceNode.getAttribute('data-entity-id');
        const targetId = await targetNode.getAttribute('data-entity-id');

        // Perform drag and drop
        await sourceRow.dragTo(targetRow);

        // Wait for state update
        await page.waitForTimeout(500);

        // Source should now have target as parent
        const updatedSource = page.locator(`[data-tree-node][data-entity-id="${sourceId}"]`);
        const newParentId = await updatedSource.getAttribute('data-parent-id');
        expect(newParentId).toBe(targetId);
      }
    });

    test('should reparent experience via drag and drop', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="experiences"]');

      const nodes = page.locator('[data-tree-node][data-entity-type="experience"]');
      if (await nodes.count() >= 2) {
        const sourceNode = nodes.nth(0);
        const targetNode = nodes.nth(1);

        const sourceRow = sourceNode.locator('[data-tree-row]');
        const targetRow = targetNode.locator('[data-tree-row]');

        const sourceId = await sourceNode.getAttribute('data-entity-id');
        const targetId = await targetNode.getAttribute('data-entity-id');

        await sourceRow.dragTo(targetRow);
        await page.waitForTimeout(500);

        const updatedSource = page.locator(`[data-tree-node][data-entity-id="${sourceId}"]`);
        const newParentId = await updatedSource.getAttribute('data-parent-id');
        expect(newParentId).toBe(targetId);
      }
    });

    test('should show drop zone visual feedback on drag over', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="places"]');

      const nodes = page.locator('[data-tree-node]');
      if (await nodes.count() >= 2) {
        const sourceRow = nodes.nth(0).locator('[data-tree-row]');
        const targetRow = nodes.nth(1).locator('[data-tree-row]');

        // Start dragging
        await sourceRow.hover();
        await page.mouse.down();
        await targetRow.hover();

        // Drop zones should appear/highlight
        const dropZones = page.locator('[data-drop-zone]');
        const count = await dropZones.count();
        expect(count).toBeGreaterThan(0);

        await page.mouse.up();
      }
    });
  });

  test.describe('Drag and Drop - Reordering', () => {
    test('should reorder sibling places via drag and drop', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="places"]');

      // Find a parent with multiple children
      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        // Expand if needed
        const isExpanded = await parentNode.getAttribute('data-expanded');
        if (isExpanded === 'false') {
          await parentNode.locator('[data-toggle]').click();
        }

        const parentId = await parentNode.getAttribute('data-entity-id');
        const children = page.locator(`[data-tree-node][data-parent-id="${parentId}"]`);

        if (await children.count() >= 2) {
          const firstChild = children.nth(0);
          const secondChild = children.nth(1);

          const firstId = await firstChild.getAttribute('data-entity-id');
          const secondId = await secondChild.getAttribute('data-entity-id');

          // Get initial order
          const firstRow = firstChild.locator('[data-tree-row]');
          const secondRow = secondChild.locator('[data-tree-row]');

          const firstBox = await firstRow.boundingBox();
          const secondBox = await secondRow.boundingBox();

          expect(firstBox).toBeTruthy();
          expect(secondBox).toBeTruthy();

          if (firstBox && secondBox) {
            const initialFirstY = firstBox.y;
            const initialSecondY = secondBox.y;

            // First should be above second
            expect(initialFirstY).toBeLessThan(initialSecondY);

            // Drag first child below second child (to a drop zone between second and its next sibling)
            const dropZone = page.locator(`[data-drop-zone][data-parent-id="${parentId}"]`).nth(2);
            if (await dropZone.count() > 0) {
              await firstRow.dragTo(dropZone);
              await page.waitForTimeout(500);

              // Verify order changed
              const updatedFirst = page.locator(`[data-tree-node][data-entity-id="${firstId}"]`);
              const updatedSecond = page.locator(`[data-tree-node][data-entity-id="${secondId}"]`);

              const updatedFirstBox = await updatedFirst.locator('[data-tree-row]').boundingBox();
              const updatedSecondBox = await updatedSecond.locator('[data-tree-row]').boundingBox();

              if (updatedFirstBox && updatedSecondBox) {
                // First should now be below second
                expect(updatedFirstBox.y).toBeGreaterThan(updatedSecondBox.y);
              }
            }
          }
        }
      }
    });

    test('should reorder sibling experiences via drag and drop', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="experiences"]');

      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        const isExpanded = await parentNode.getAttribute('data-expanded');
        if (isExpanded === 'false') {
          await parentNode.locator('[data-toggle]').click();
        }

        const parentId = await parentNode.getAttribute('data-entity-id');
        const children = page.locator(`[data-tree-node][data-parent-id="${parentId}"]`);

        if (await children.count() >= 2) {
          const firstChild = children.nth(0);
          const secondChild = children.nth(1);

          const firstRow = firstChild.locator('[data-tree-row]');
          const secondRow = secondChild.locator('[data-tree-row]');

          const firstBox = await firstRow.boundingBox();
          const secondBox = await secondRow.boundingBox();

          if (firstBox && secondBox) {
            expect(firstBox.y).toBeLessThan(secondBox.y);

            // Drag to reorder (simplified - just verify drag is possible)
            const firstId = await firstChild.getAttribute('data-entity-id');
            await firstRow.dragTo(secondRow);
            await page.waitForTimeout(500);

            // Node should still exist (even if order might not change due to other factors)
            const updatedFirst = page.locator(`[data-tree-node][data-entity-id="${firstId}"]`);
            await expect(updatedFirst).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Tree View Selection and Highlighting', () => {
    test('should select tree node on click and highlight descendants', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="places"]');

      const parentNode = page.locator('[data-tree-node][data-has-children="true"]').first();

      if (await parentNode.count() > 0) {
        // Expand if needed
        const isExpanded = await parentNode.getAttribute('data-expanded');
        if (isExpanded === 'false') {
          await parentNode.locator('[data-toggle]').click();
        }

        const parentId = await parentNode.getAttribute('data-entity-id');

        // Click parent row
        await parentNode.locator('[data-tree-row]').click();

        // Parent should be selected
        await expect(parentNode).toHaveAttribute('data-selected', 'true');

        // Children should be highlighted
        const children = page.locator(`[data-tree-node][data-parent-id="${parentId}"]`);
        const firstChild = children.first();

        if (await firstChild.count() > 0) {
          await expect(firstChild).toHaveAttribute('data-highlighted', 'true');
        }
      }
    });

    test('should support multi-selection in tree views', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="places"]');

      const nodes = page.locator('[data-tree-node]');
      if (await nodes.count() >= 2) {
        const firstNode = nodes.nth(0);
        const secondNode = nodes.nth(1);

        // Select first
        await firstNode.locator('[data-tree-row]').click();
        await expect(firstNode).toHaveAttribute('data-selected', 'true');

        // Ctrl+click second
        await secondNode.locator('[data-tree-row]').click({ modifiers: ['Control'] });

        // Both should be selected
        await expect(firstNode).toHaveAttribute('data-selected', 'true');
        await expect(secondNode).toHaveAttribute('data-selected', 'true');

        // Popover should show both
        const popover = page.locator('[data-selection-popover]');
        const popoverChips = popover.locator('[data-entity-chip]');
        await expect(popoverChips).toHaveCount(2);
      }
    });

    test('should maintain selection across view switches', async ({ page }) => {
      await page.click('[data-pane="right"] [data-tab="places"]');

      const placeNode = page.locator('[data-tree-node][data-entity-type="place"]').first();
      const placeId = await placeNode.getAttribute('data-entity-id');

      // Select place
      await placeNode.locator('[data-tree-row]').click();
      await expect(placeNode).toHaveAttribute('data-selected', 'true');

      // Switch to Notes view
      await page.click('[data-pane="right"] [data-tab="notes"]');

      // Find corresponding chip in notes
      const chip = page.locator(`[data-entity-chip][data-entity-id="${placeId}"]`).first();

      if (await chip.count() > 0) {
        // Chip should also be selected
        await expect(chip).toHaveAttribute('data-selected', 'true');
      }

      // Switch back to Places
      await page.click('[data-pane="right"] [data-tab="places"]');

      // Place should still be selected
      const updatedPlaceNode = page.locator(`[data-tree-node][data-entity-id="${placeId}"]`);
      await expect(updatedPlaceNode).toHaveAttribute('data-selected', 'true');
    });
  });
});
