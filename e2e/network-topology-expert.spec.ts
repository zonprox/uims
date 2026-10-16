import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Playwright E2E — Network Topology Expert Standards & PDF Blueprint Verification', () => {
  test('verifies multi-perspective canvas, zero overlaps, directional port badges, zero PoE, and valid PDF export', async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Step 1: Real UI Authentication
    // -------------------------------------------------------------------------
    await test.step('Authenticate via authentic UI login as Administrator', async () => {
      await loginAsAdmin(page);
      await expect(page).not.toHaveURL(/\/login/);
    });

    // -------------------------------------------------------------------------
    // Step 2: Navigation & Initial Canvas Load
    // -------------------------------------------------------------------------
    await test.step('Navigate to /network and switch to Topology Map tab', async () => {
      await page.goto('/network');
      await page.waitForLoadState('networkidle');

      // Verify Network page header
      await expect(page.getByRole('heading', { name: 'Network', exact: true })).toBeVisible();

      // Click dedicated Topology Map tab unconditionally
      const topologyTab = page
        .locator('.ant-tabs-tab')
        .filter({ hasText: /Topology|Sơ đồ/i })
        .first();
      await expect(topologyTab).toBeVisible({ timeout: 10000 });
      await topologyTab.click();
      await page.waitForLoadState('networkidle');

      // Assert canvas SVG is rendered and visible
      const canvas = page.locator('svg.topology-canvas, [data-testid="topology-canvas"]').first();
      await expect(canvas).toBeVisible({ timeout: 15000 });
    });

    const canvas = page.locator('svg.topology-canvas, [data-testid="topology-canvas"]').first();
    const viewSwitcher = page.locator('[data-testid="topology-view-switcher"]').first();

    // -------------------------------------------------------------------------
    // Step 3: Multi-Perspective Verification (ALL, NETWORK, CCTV)
    // -------------------------------------------------------------------------
    await test.step('Verify multi-perspective views: ALL, NETWORK, and CCTV', async () => {
      await expect(viewSwitcher).toBeVisible();

      // 3a. ALL Infrastructure view
      const allBtn = viewSwitcher.getByText(/All Infrastructure|All/i).first();
      await allBtn.click();
      await page.waitForTimeout(500);

      const allNodes = canvas.locator('[data-testid^="topology-node-"]');
      await expect(allNodes.first()).toBeVisible({ timeout: 10000 });
      const allNodeCount = await allNodes.count();
      expect(allNodeCount).toBeGreaterThanOrEqual(15);

      const allEdges = canvas.locator('[data-testid^="topology-edge-"]');
      await expect(allEdges.first()).toBeVisible({ timeout: 10000 });
      const allEdgeCount = await allEdges.count();
      expect(allEdgeCount).toBeGreaterThanOrEqual(10);

      // Verify presence of core switches, racks, and server endpoints in ALL view
      await expect(canvas.locator('[data-testid^="topology-node-switch-"]').first()).toBeVisible();
      await expect(canvas.locator('[data-testid^="topology-node-rack-"]').first()).toBeVisible();

      // 3b. NETWORK Infrastructure view
      const netBtn = viewSwitcher.getByText(/Network Only|Network/i).first();
      await netBtn.click();
      await page.waitForTimeout(500);

      const netNodes = canvas.locator('[data-testid^="topology-node-"]');
      await expect(netNodes.first()).toBeVisible({ timeout: 10000 });
      const netNodeCount = await netNodes.count();
      expect(netNodeCount).toBeGreaterThanOrEqual(10);
      await expect(canvas.locator('[data-testid^="topology-node-switch-"]').first()).toBeVisible();

      // Contextual sub-filters for NETWORK perspective
      await expect(page.locator('[data-testid="topology-role-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="topology-vlan-filter"]')).toBeVisible();

      // 3c. CCTV Surveillance view
      const cctvBtn = viewSwitcher.getByText(/CCTV System|CCTV/i).first();
      await cctvBtn.click();
      await page.waitForTimeout(500);

      const cctvNodes = canvas.locator('[data-testid^="topology-node-"]');
      await expect(cctvNodes.first()).toBeVisible({ timeout: 10000 });
      await expect(canvas.locator('[data-testid^="topology-node-camera-"]').first()).toBeVisible();
      await expect(canvas.locator('[data-testid^="topology-node-nvr-"]').first()).toBeVisible();

      // Contextual sub-filters for CCTV perspective
      await expect(page.locator('[data-testid="topology-floor-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="topology-status-filter"]')).toBeVisible();

      // Return to ALL view for blueprint & overlap checks
      await allBtn.click();
      await page.waitForTimeout(500);
    });

    // -------------------------------------------------------------------------
    // Step 4: Network-Expert Bounding-Box Overlap Check
    // -------------------------------------------------------------------------
    await test.step('Assert zero node-to-node bounding-box overlaps across all visible node cards', async () => {
      // Apply hierarchical auto-layout to organize topology into clear non-overlapping tiers
      const autoLayoutBtn = page.locator('[data-testid="auto-layout-hierarchical-button"]').first();
      if (await autoLayoutBtn.isVisible()) {
        await autoLayoutBtn.click();
        await page.waitForTimeout(500);
      }

      // Fit all nodes into screen view with deterministic margins
      const fitBtn = page.locator('[data-testid="fit-to-screen-button"]').first();
      if (await fitBtn.isVisible()) {
        await fitBtn.click();
        await page.waitForTimeout(500);
      }

      // Collect bounding boxes of all visible node cards
      const nodeElements = canvas.locator('[data-testid^="topology-node-"]');
      const count = await nodeElements.count();
      expect(count).toBeGreaterThanOrEqual(15);

      interface NodeBounding {
        id: string;
        box: { x: number; y: number; width: number; height: number };
      }

      const visibleNodes: NodeBounding[] = [];
      for (let i = 0; i < count; i++) {
        const nodeEl = nodeElements.nth(i);
        // The node card body is the primary card rect defining the physical card boundary
        const cardRect = nodeEl.locator('rect').first();
        const box = await cardRect.boundingBox();
        if (box && box.width > 20 && box.height > 20) {
          const testId = (await nodeEl.getAttribute('data-testid')) || `node-${i}`;
          visibleNodes.push({ id: testId, box });
        }
      }

      expect(visibleNodes.length).toBeGreaterThanOrEqual(15);

      // Pairwise overlap detection: cards must have non-overlapping bounding areas
      const overlappingPairs: string[] = [];
      for (let i = 0; i < visibleNodes.length; i++) {
        for (let j = i + 1; j < visibleNodes.length; j++) {
          const a = visibleNodes[i].box;
          const b = visibleNodes[j].box;

          // Intersection rectangle calculation with 2px tolerance
          const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
          const yOverlap = Math.max(
            0,
            Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
          );

          if (xOverlap > 2 && yOverlap > 2) {
            overlappingPairs.push(
              `${visibleNodes[i].id} collides with ${visibleNodes[j].id} (${xOverlap.toFixed(1)}px x ${yOverlap.toFixed(1)}px)`,
            );
          }
        }
      }

      // Network-expert standard: zero overlaps permitted
      expect(overlappingPairs).toEqual([]);

      // Verify edge pill text elements are non-empty and readable
      const edgePills = canvas.locator('.topology-edge-group text');
      const edgePillCount = await edgePills.count();
      expect(edgePillCount).toBeGreaterThanOrEqual(10);
      for (let i = 0; i < Math.min(edgePillCount, 10); i++) {
        const text = await edgePills.nth(i).textContent();
        expect(text).toBeTruthy();
        expect(text!.trim().length).toBeGreaterThan(0);
      }
    });

    // -------------------------------------------------------------------------
    // Step 5: Explicit Directional Port-to-Port Link Labels
    // -------------------------------------------------------------------------
    await test.step('Assert explicit directional port-to-port link labels on edges', async () => {
      const edgePills = canvas.locator('.topology-edge-group text');
      const pillTexts = await edgePills.allTextContents();
      expect(pillTexts.length).toBeGreaterThanOrEqual(10);

      // Trunk links must feature bidirectional arrow '↔' with explicit port names (e.g. Te1/0/49 ↔ Te1/0/1)
      const trunkLinks = pillTexts.filter((t) => t.includes('↔'));
      expect(trunkLinks.length).toBeGreaterThanOrEqual(3);
      const hasDetailedTrunkPortFormat = trunkLinks.some((t) =>
        /(?:Te|Gi|QSFP)\d+\/\d+\/\d+\s*↔\s*(?:Te|Gi|QSFP)\d+\/\d+\/\d+/i.test(t),
      );
      expect(hasDetailedTrunkPortFormat).toBe(true);

      // Endpoint links must feature directional arrow '→' with switch port and endpoint (e.g. Gi1/0/5 → eth0)
      const endpointLinks = pillTexts.filter((t) => t.includes('→'));
      expect(endpointLinks.length).toBeGreaterThanOrEqual(5);
      const hasDetailedEndpointPortFormat = endpointLinks.some((t) =>
        /(?:Gi|Te|eth)\d+[\w/]*\s*→/i.test(t),
      );
      expect(hasDetailedEndpointPortFormat).toBe(true);

      // Hover over edge pill and inspect tooltip / SVG <title>
      const trunkEdgeGroup = canvas
        .locator('.topology-edge-group')
        .filter({ hasText: '↔' })
        .first();
      await expect(trunkEdgeGroup).toBeVisible();
      const titleTag = trunkEdgeGroup.locator('title');
      const titleText = await titleTag.textContent();
      expect(titleText).toBeTruthy();
      expect(titleText).toContain('↔');
      expect(titleText).toMatch(/Speed:|Status:|Media:/i);
    });

    // -------------------------------------------------------------------------
    // Step 6: Live Zero-PoE DOM Invariant
    // -------------------------------------------------------------------------
    await test.step('Assert zero PoE occurrences across live DOM, legend, and filters', async () => {
      // 6a. Zero lightning bolt symbol in rendered DOM
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toContain('⚡');

      // 6b. Zero PoE references in canvas footer legend
      const legend = page.locator('div:has-text("Copper Link"):has-text("Fiber Trunk")').first();
      await expect(legend).toBeVisible();
      const legendText = await legend.innerText();
      expect(legendText).not.toMatch(/PoE/i);
      expect(legendText).not.toContain('⚡');

      // 6c. Zero POE_ACCESS in switch role filter
      await viewSwitcher
        .getByText(/Network Only|Network/i)
        .first()
        .click();
      await page.waitForTimeout(400);

      const roleFilter = page.locator('[data-testid="topology-role-filter"]').first();
      await expect(roleFilter).toBeVisible();
      await roleFilter.click();

      const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      await expect(dropdown).toBeVisible();
      const dropdownText = await dropdown.innerText();
      expect(dropdownText).toContain('Core');
      expect(dropdownText).toContain('Distribution');
      expect(dropdownText).toContain('Access');
      expect(dropdownText).not.toMatch(/POE_ACCESS|PoE/i);

      // Close dropdown
      await page.keyboard.press('Escape');

      // 6d. Summary bar has exactly 3 cards and summary-card-poe-power is absent
      const summaryBar = page.locator('[data-testid="topology-summary-bar"]');
      await expect(summaryBar).toBeVisible();
      await expect(summaryBar.locator('[data-testid="summary-card-fleet-nodes"]')).toBeVisible();
      await expect(summaryBar.locator('[data-testid="summary-card-active-links"]')).toBeVisible();
      await expect(summaryBar.locator('[data-testid="summary-card-health-index"]')).toBeVisible();
      await expect(page.locator('[data-testid="summary-card-poe-power"]')).toHaveCount(0);

      // 6e. Exhaustive DOM token scan for any forbidden PoE indicators
      const poeArtifacts = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const violations: string[] = [];
        if (text.includes('⚡')) violations.push('lightning_bolt_symbol');
        if (/POE_ACCESS/i.test(text)) violations.push('POE_ACCESS');
        if (/PoE Delivery/i.test(text)) violations.push('PoE Delivery');
        if (/summary-card-poe-power/i.test(document.body.innerHTML))
          violations.push('summary-card-poe-power');
        return violations;
      });
      expect(poeArtifacts).toEqual([]);

      // Return to ALL view
      await viewSwitcher
        .getByText(/All Infrastructure|All/i)
        .first()
        .click();
      await page.waitForTimeout(400);
    });

    // -------------------------------------------------------------------------
    // Step 7: PDF Blueprint Export Validation
    // -------------------------------------------------------------------------
    await test.step('Trigger PDF export and verify valid landscape architecture blueprint', async () => {
      const exportBtn = page.locator('[data-testid="export-topology-pdf-button"]').first();
      await expect(exportBtn).toBeVisible({ timeout: 10000 });
      await expect(exportBtn).toBeEnabled();

      // Await real browser download event
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await exportBtn.click();
      const download = await downloadPromise;

      // Verify filename adheres to pattern
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/^(?:uims-)?network-topology-all.*\.pdf$/i);

      // Save and inspect binary content of downloaded PDF
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      if (downloadPath) {
        const buffer = fs.readFileSync(downloadPath);
        expect(buffer.length).toBeGreaterThan(1000);

        const pdfRawString = buffer.toString('latin1');
        // Assert valid PDF 1.4 header
        expect(pdfRawString.startsWith('%PDF-1.4')).toBe(true);
        // Assert valid PDF EOF marker
        expect(pdfRawString).toContain('%%EOF');
        // Assert blueprint document metadata
        expect(pdfRawString).toContain('Unified IT Management System');
        expect(pdfRawString).toContain('UIMS Enterprise Network Infrastructure Blueprint');
      }
    });
  });
});
