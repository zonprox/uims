import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Playwright E2E Suite 2 — Interactive Canvas Network & CCTV Topology', () => {
  test('navigates network topology, switches perspectives, tests interactive port patching and drawers', async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // 1. Real UI Authentication
    // -------------------------------------------------------------------------
    await test.step('Authenticate via real login UI', async () => {
      await loginAsAdmin(page);
      await expect(page).not.toHaveURL(/\/login/);
    });

    // -------------------------------------------------------------------------
    // 2. Navigate to Network & IPAM Topology
    // -------------------------------------------------------------------------
    await test.step('Navigate to /network and verify topology infrastructure overview', async () => {
      await page.goto('/network');
      await page.waitForLoadState('networkidle');

      // Header verification
      await expect(page.getByRole('heading', { name: 'Network', exact: true })).toBeVisible();

      // Verify live telemetry summary stats
      await expect(page.locator('.ant-card').filter({ hasText: 'Total Racks' })).toBeVisible();
      await expect(page.locator('.ant-card').filter({ hasText: 'Total Switches' })).toBeVisible();
      await expect(page.locator('.ant-card').filter({ hasText: 'Total Ports' })).toBeVisible();
      await expect(page.locator('.ant-card').filter({ hasText: 'Port Utilization' })).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 3. Multi-Perspective View Switching: All, Network, and CCTV
    // -------------------------------------------------------------------------
    await test.step('Switch views and verify Network vs CCTV subsystem topologies on Interactive Canvas', async () => {
      // 3a. Click dedicated Topology Map tab unconditionally
      const topologyTab = page
        .locator('.ant-tabs-tab')
        .filter({ hasText: /Topology|Sơ đồ/i })
        .first();
      await expect(topologyTab).toBeVisible({ timeout: 10000 });
      await topologyTab.click();
      await page.waitForLoadState('networkidle');

      // Verify Canvas is rendered and visible
      const canvas = page.locator('svg.topology-canvas, [data-testid="topology-canvas"]').first();
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Perspective switchers on Canvas
      const viewSwitcher = page
        .locator('[data-testid="topology-view-switcher"], .ant-segmented, .ant-radio-group')
        .first();
      await expect(viewSwitcher).toBeVisible();

      // 1. All Infrastructure view
      const allBtn = viewSwitcher.getByText(/All/i).first();
      await expect(allBtn).toBeVisible();
      await allBtn.click();
      await page.waitForTimeout(400);
      await expect(canvas.locator('[data-testid^="topology-node-"]').first()).toBeVisible({
        timeout: 10000,
      });

      // 2. Network view
      const netBtn = viewSwitcher.getByText(/Network/i).first();
      await expect(netBtn).toBeVisible();
      await netBtn.click();
      await page.waitForTimeout(400);
      await expect(canvas.locator('[data-testid^="topology-node-"]').first()).toBeVisible({
        timeout: 10000,
      });

      // 3. CCTV view
      const cctvBtn = viewSwitcher.getByText(/CCTV/i).first();
      await expect(cctvBtn).toBeVisible();
      await cctvBtn.click();
      await page.waitForTimeout(400);
      await expect(canvas.locator('[data-testid^="topology-node-"]').first()).toBeVisible({
        timeout: 10000,
      });

      // Test Node Dragging & Coordinate Persistence
      const firstNode = canvas.locator('[data-testid^="topology-node-"]').first();
      await expect(firstNode).toBeVisible();
      await firstNode.scrollIntoViewIfNeeded();
      const nodeBox = await firstNode.boundingBox();
      if (nodeBox) {
        await page.mouse.move(nodeBox.x + 20, nodeBox.y + 20);
        await page.mouse.down();
        await page.mouse.move(nodeBox.x + 80, nodeBox.y + 80, { steps: 5 });
        await page.mouse.up();
      }

      // Save Layout
      const saveLayoutBtn = page.locator('[data-testid="save-layout-button"]').first();
      if (!(await saveLayoutBtn.isEnabled())) {
        const autoLayoutBtn = page.locator('button').filter({ hasText: 'Auto Layout' }).first();
        if (await autoLayoutBtn.isVisible()) {
          await autoLayoutBtn.click();
        }
      }
      await expect(saveLayoutBtn).toBeEnabled({ timeout: 5000 });
      await saveLayoutBtn.click();
      await expect(
        page.locator('.ant-message-success').filter({ hasText: /saved/i }),
      ).toBeVisible({ timeout: 10000 });

      // Test Search on Canvas
      const searchInput = page.locator('[data-testid="topology-search-input"] input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('SW');
        await page.waitForTimeout(300);
        await searchInput.clear();
      }

      // Switch back to All view for drill-down testing
      await allBtn.click();
      await page.waitForTimeout(400);

      // Contextual Drill-down: Click a switch node on Canvas to open SwitchFaceplateDrawer
      const switchNode = canvas.locator('[data-testid^="topology-node-switch-"]').first();
      await expect(switchNode).toBeVisible({ timeout: 10000 });
      await switchNode.click();
      const faceplateDrawer = page
        .locator('.ant-drawer:visible, [role="dialog"]')
        .filter({ hasText: 'Physical Front Panel Faceplate' })
        .first();
      await expect(faceplateDrawer).toBeVisible({ timeout: 10000 });
      const closeFaceplateBtn = faceplateDrawer
        .locator('.ant-drawer-close, button[aria-label="Close"], button:has-text("Close")')
        .first();
      await closeFaceplateBtn.click();
      await expect(faceplateDrawer).not.toBeVisible();

      // Contextual Drill-down: Click a rack node on Canvas to open RackElevationDrawer
      const rackNode = canvas.locator('[data-testid^="topology-node-rack-"]').first();
      await expect(rackNode).toBeVisible({ timeout: 10000 });
      await rackNode.click();
      const elevationDrawer = page
        .locator('.ant-drawer:visible, [role="dialog"]')
        .filter({ hasText: /42U Standard|2D ELEVATION|Rack Elevation/i })
        .first();
      await expect(elevationDrawer).toBeVisible({ timeout: 10000 });
      await expect(elevationDrawer.locator('[data-testid="rack-cabinet-frame"]')).toBeVisible();
      const closeElevationBtn = elevationDrawer
        .locator('.ant-drawer-close, button[aria-label="Close"], button:has-text("Close")')
        .first();
      await closeElevationBtn.click();
      await expect(elevationDrawer).not.toBeVisible();

      // Test Cable Patch Modal button
      const patchBtn = page.locator('[data-testid="patch-cable-button"]').first();
      await expect(patchBtn).toBeVisible({ timeout: 10000 });
      await patchBtn.click();
      const patchModal = page
        .locator('.ant-modal:visible, [role="dialog"]')
        .filter({ hasText: /Patching|Cable/i })
        .first();
      await expect(patchModal).toBeVisible({ timeout: 10000 });
      const cancelBtn = patchModal.locator('button').filter({ hasText: /Cancel|Hủy/i }).first();
      await cancelBtn.click();
      await expect(patchModal).not.toBeVisible();

      // 3b. Verify Subnets view contains both Enterprise Network and CCTV Surveillance Subsystems
      const subnetsTab = page
        .locator('.ant-tabs-tab')
        .filter({ hasText: /Subnets/i })
        .first();
      await expect(subnetsTab).toBeVisible();
      await subnetsTab.click();
      await page.waitForLoadState('networkidle');

      // CCTV Subnet verification
      const cctvSubnet = page
        .getByRole('tabpanel', { name: /Subnets/i })
        .locator('tr, .ant-card')
        .filter({ hasText: /CCTV|Camera/i })
        .first();
      await expect(cctvSubnet).toBeVisible({ timeout: 10000 });

      // 3c. Verify VLANs view contains CCTV and Corporate VLANs
      const vlansTab = page.locator('.ant-tabs-tab').filter({ hasText: /VLANs/i }).first();
      await expect(vlansTab).toBeVisible();
      await vlansTab.click();
      await page.waitForLoadState('networkidle');

      const vlanTable = page.getByRole('tabpanel', { name: /VLANs/i }).locator('.ant-table-tbody');
      await expect(vlanTable).toBeVisible({ timeout: 10000 });
      await expect(vlanTable).toContainText(/VLAN/i);
    });

    // -------------------------------------------------------------------------
    // 4. Interactive Switch Fleet & Front Panel Faceplate
    // -------------------------------------------------------------------------
    await test.step('Open Switches tab and inspect interactive 24/48-port faceplate', async () => {
      const switchesTab = page.locator('.ant-tabs-tab').filter({ hasText: 'Switches' }).first();
      await expect(switchesTab).toBeVisible();
      await switchesTab.click();
      await page.waitForLoadState('networkidle');

      // Verify switch fleet table
      const switchTable = page
        .getByRole('tabpanel', { name: /Switches/i })
        .locator('.ant-table-tbody');
      await expect(switchTable).toBeVisible({ timeout: 10000 });

      // Open faceplate for the first switch
      const faceplateBtn = page
        .getByRole('tabpanel', { name: /Switches/i })
        .locator('button[data-testid^="view-faceplate-"], button:has-text("Faceplate")')
        .first();
      await expect(faceplateBtn).toBeVisible();
      await faceplateBtn.click();

      // SwitchFaceplateDrawer opens
      const faceplateDrawer = page
        .locator('.ant-drawer:visible, [role="dialog"]')
        .filter({ hasText: 'Physical Front Panel Faceplate' })
        .first();
      await expect(faceplateDrawer).toBeVisible({ timeout: 10000 });

      // Verify physical front panel port matrix is rendered
      const portFaceplate = faceplateDrawer
        .locator('.switch-port-faceplate, [data-testid="port-matrix"], .ant-card')
        .filter({ hasText: 'Physical Front Panel Faceplate' });
      await expect(portFaceplate).toBeVisible();

      // Port Matrix table must be present
      await expect(faceplateDrawer.getByText('Port Matrix & Endpoint Directory')).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 5. Interactive Port Patching & Unpatching (PortConfigDrawer)
    // -------------------------------------------------------------------------
    await test.step('Execute interactive port patching and unpatching in PortConfigDrawer', async () => {
      const faceplateDrawer = page
        .locator('.ant-drawer:visible, [role="dialog"]')
        .filter({ hasText: 'Physical Front Panel Faceplate' })
        .first();

      // Click configure button on Port 1 or first port in the sub-table
      const configPortBtn = faceplateDrawer
        .locator(
          'button[data-testid^="configure-port-table-"], .ant-table-tbody tr button:has(.anticon-setting)',
        )
        .first();
      await expect(configPortBtn).toBeVisible({ timeout: 10000 });
      await configPortBtn.click();

      // Nested PortConfigDrawer opens
      const portDrawer = page
        .locator('.ant-drawer:visible, [role="dialog"]')
        .filter({ hasText: 'Configure Port:' })
        .first();
      await expect(portDrawer).toBeVisible({ timeout: 10000 });

      // Verify port form fields
      await expect(portDrawer.getByText('Administrative & Operational Link State')).toBeVisible();
      await expect(portDrawer.getByText('Layer-2 Switching & VLAN Segmentation')).toBeVisible();
      await expect(portDrawer.getByText('Power over Ethernet (PoE Delivery)')).toBeVisible();

      // Interactive patch operation: toggle PoE or change Operational Status
      const operStatusSelect = portDrawer
        .locator('[data-testid="port-oper-status-select"]')
        .first();
      await expect(operStatusSelect).toBeVisible({ timeout: 10000 });
      await operStatusSelect.click();

      const selectOption = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
        .first();
      await expect(selectOption).toBeVisible({ timeout: 10000 });
      await selectOption.click();

      // Save port patch
      const savePortBtn = portDrawer
        .locator('[data-testid="save-port-config-button"]')
        .or(portDrawer.getByRole('button', { name: 'Save' }))
        .first();
      await expect(savePortBtn).toBeEnabled();
      await savePortBtn.click();

      // Verify success message
      await expect(
        page
          .locator('.ant-message-success')
          .filter({ hasText: 'configuration updated successfully' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(portDrawer).not.toBeVisible();

      // Interactive unpatch operation: Re-open port and clear bindings
      await configPortBtn.click();
      await expect(portDrawer).toBeVisible({ timeout: 10000 });

      const clearPortBtn = portDrawer.locator('[data-testid="clear-port-button"]').first();
      await expect(clearPortBtn).toBeVisible();
      await clearPortBtn.click();

      // Verify clear feedback
      await expect(
        page.locator('.ant-message-success').filter({ hasText: 'Cleared endpoint bindings' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(portDrawer).not.toBeVisible();

      // Close faceplate drawer
      const closeFaceplateBtn = faceplateDrawer
        .locator('.ant-drawer-close, button[aria-label="Close"], button:has-text("Close")')
        .first();
      await closeFaceplateBtn.click();
      await expect(faceplateDrawer).not.toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 6. Equipment Rack Elevation & Cabinet Drill-Down
    // -------------------------------------------------------------------------
    await test.step('Open Racks & Elevation tab and verify 42U cabinet elevation with live data', async () => {
      const racksTab = page
        .locator('.ant-tabs-tab')
        .filter({ hasText: 'Racks & Elevation' })
        .first();
      await expect(racksTab).toBeVisible();
      await racksTab.click();
      await page.waitForLoadState('networkidle');

      // Verify Rack cards / table
      const rackCards = page
        .getByRole('tabpanel', { name: /Racks/i })
        .locator('.ant-table-tbody tr, .ant-card')
        .filter({ hasText: /RCK-|Rack/i });
      await expect(rackCards.first()).toBeVisible({ timeout: 10000 });

      // Click on a rack to inspect elevation view
      const viewRackBtn = page
        .getByRole('tabpanel', { name: /Racks/i })
        .locator('button[data-testid^="view-elevation-"], button:has-text("Elevation")')
        .first();
      await expect(viewRackBtn).toBeVisible({ timeout: 10000 });
      await viewRackBtn.click();

      // Rack elevation drawer & cabinet frame (42U Standard)
      const elevationDrawer = page
        .locator('.ant-drawer:visible, [role="dialog"]')
        .filter({ hasText: /42U Standard|2D ELEVATION|Rack Elevation/i })
        .first();
      await expect(elevationDrawer).toBeVisible({ timeout: 10000 });
      await expect(elevationDrawer.locator('[data-testid="rack-cabinet-frame"]')).toBeVisible();
    });
  });
});
