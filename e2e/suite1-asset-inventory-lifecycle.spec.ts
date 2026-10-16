import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { createMockPdfBuffer } from './helpers/files';

test.describe('Playwright E2E Suite 1 — Asset & Warehouse Inventory Lifecycle', () => {
  const runId = Math.floor(1000 + Math.random() * 9000);
  const testModelCode = `MOD-E2E-${runId}`;
  const testModelName = `Dell Latitude 5420 Rugged E2E-${runId}`;
  const testTagPrefix = `AST-E2E-${runId}-`;

  test('executes end-to-end asset & inventory lifecycle with mandatory compliance tracking', async ({
    page,
  }) => {
    test.setTimeout(180000);
    // -------------------------------------------------------------------------
    // 1. Real UI Authentication
    // -------------------------------------------------------------------------
    await test.step('Authenticate via real login UI', async () => {
      await loginAsAdmin(page);
      await expect(page).not.toHaveURL(/\/login/);
    });

    // -------------------------------------------------------------------------
    // 2. Navigate to Warehouse Inventory
    // -------------------------------------------------------------------------
    await test.step('Navigate to /inventory and verify master catalog view', async () => {
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');

      await expect(
        page
          .locator('.ant-page-header-heading-title, h1, h2, h3, h4')
          .filter({ hasText: 'Warehouse Inventory' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Item' })).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 3. Create Device Model
    // -------------------------------------------------------------------------
    await test.step('Create new Device Model in catalog', async () => {
      await page.getByRole('button', { name: 'Create Item' }).click();

      // DeviceModelDrawer opens
      const drawer = page.getByRole('dialog').filter({ hasText: 'Create Item / Device Model' });
      await expect(drawer).toBeVisible({ timeout: 10000 });

      // Fill model fields
      const modelCodeInput = drawer.getByRole('textbox', { name: 'Model Code / SKU' });
      await modelCodeInput.fill(testModelCode);

      const nameInput = drawer.getByRole('textbox', { name: 'Model Name' });
      await nameInput.fill(testModelName);

      const manufacturerInput = drawer.getByRole('textbox', { name: 'Manufacturer' });
      await manufacturerInput.fill('Dell Inc.');

      // Fill unit cost & threshold
      const minThresholdInput = drawer
        .locator('input#minThreshold')
        .or(drawer.getByRole('spinbutton', { name: 'Safety Threshold' }))
        .first();
      await minThresholdInput.fill('5');

      const unitCostInput = drawer
        .locator('input#unitCost')
        .or(drawer.getByRole('spinbutton', { name: 'Unit Cost ($)' }))
        .first();
      await unitCostInput.fill('1250');

      const binInput = drawer
        .locator('input#binLocation')
        .or(drawer.getByRole('textbox', { name: 'Storage Bin (optional)' }))
        .first();
      await binInput.fill('BIN-E2E-01');

      // Submit creation
      const createButton = drawer.getByRole('button', { name: 'Create Model' });
      await expect(createButton).toBeEnabled();
      await createButton.click();

      // Wait for success toast
      await expect(
        page.locator('.ant-message-success').filter({ hasText: testModelName }),
      ).toBeVisible({ timeout: 15000 });
      await expect(drawer).not.toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 4. Batch Stock Intake
    // -------------------------------------------------------------------------
    await test.step('Execute Batch Stock Intake to receive physical units into warehouse', async () => {
      await page.getByRole('button', { name: 'Receive Units (Intake)' }).click();

      const intakeDrawer = page.getByRole('dialog').filter({ hasText: 'Batch Stock Intake' });
      await expect(intakeDrawer).toBeVisible({ timeout: 10000 });

      // Select newly created device model in intake drawer if not already selected
      const combobox = intakeDrawer.getByRole('combobox', { name: 'Device Catalog Model' });
      const currentVal = await combobox.textContent().catch(() => '');
      if (!currentVal?.includes(testModelCode)) {
        await combobox.click();
        const modelOption = page
          .locator('.ant-select-dropdown:visible .ant-select-item-option')
          .filter({ hasText: testModelCode })
          .first();
        if (await modelOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await modelOption.click();
        }
      }

      // Unit count: 3 units
      const countInput = intakeDrawer.getByRole('spinbutton', { name: 'Units to Receive' });
      await countInput.fill('3');

      // SUB Tag prefix
      const tagPrefixInput = intakeDrawer.getByRole('textbox', { name: 'SUB Tag Prefix' });
      await tagPrefixInput.fill(testTagPrefix);

      // Start sequence
      const seqInput = intakeDrawer.getByRole('spinbutton', { name: 'Start Sequence Number' });
      await seqInput.fill('101');

      // Submit batch intake
      const receiveButton = intakeDrawer.getByRole('button', { name: 'Receive Units into Stock' });
      await expect(receiveButton).toBeEnabled();
      await receiveButton.click();

      await expect(intakeDrawer).not.toBeVisible({ timeout: 20000 });
      await expect(
        page.locator('.ant-message-success, .ant-notification-notice-success').first(),
      ).toBeVisible({ timeout: 15000 });
    });

    // -------------------------------------------------------------------------
    // 5. Verify live stock counters
    // -------------------------------------------------------------------------
    await test.step('Verify live stock counters reflect received physical units', async () => {
      // Filter or search for our model
      const searchInput = page.locator('input[placeholder*="Search by SKU"]').first();
      await searchInput.fill(testModelCode);
      await page.waitForTimeout(500);

      // Table row must show 3 units in stock
      const modelRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: testModelCode })
        .first();
      await expect(modelRow).toBeVisible({ timeout: 10000 });
      await expect(modelRow).toContainText('3 in stock');
      await expect(modelRow).toContainText('Avail: 3');
      await expect(modelRow).toContainText('Total: 3');
    });

    // -------------------------------------------------------------------------
    // 6. Allocate unit to employee (AVAILABLE -> IN_USE)
    // -------------------------------------------------------------------------
    await test.step('Allocate available unit to employee without signed doc (triggering compliance pending)', async () => {
      const modelRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: testModelCode })
        .first();

      // Click Allocate button on model row
      const allocateBtn = modelRow.locator('button:has(.anticon-user-switch)').first();
      await allocateBtn.click();

      const assignDrawer = page
        .locator('.ant-drawer:visible')
        .filter({ hasText: 'Batch Assign Hardware Assets' });
      await expect(assignDrawer).toBeVisible({ timeout: 10000 });

      // Select target employee (wait for employee options to finish loading)
      const employeeSelect = assignDrawer.locator('.ant-select:has(#assignedToId)').first();
      await expect(employeeSelect).toBeVisible({ timeout: 10000 });
      await expect(employeeSelect).not.toHaveClass(/ant-select-loading/, { timeout: 10000 });
      await page.waitForTimeout(500); // allow drawer slide-in animation to settle
      await employeeSelect.click();

      const employeeOption = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
        .first();
      if (!(await employeeOption.isVisible().catch(() => false))) {
        await employeeSelect.click();
      }
      await expect(employeeOption).toBeVisible({ timeout: 10000 });
      await employeeOption.click();

      // Submit assignment (without uploading signed doc)
      const submitAssignBtn = assignDrawer.getByRole('button', { name: /Assign .* Asset/i });
      await expect(submitAssignBtn).toBeEnabled();
      await submitAssignBtn.click();

      // Verify success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 15000 });
      await expect(assignDrawer).not.toBeVisible();

      // Verify stock counters updated (Avail: 0, In Use: 3)
      await page.waitForTimeout(500);
      await expect(modelRow).toContainText('In Use: 3');
      await expect(modelRow).toContainText('Avail: 0');
    });

    // -------------------------------------------------------------------------
    // 7. Verify Dashboard Pending Handover Documents Alert
    // -------------------------------------------------------------------------
    await test.step('Verify /dashboard displays active Pending Handover Documents compliance alert', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The warning alert must be prominently rendered
      const alert = page
        .locator('.ant-alert-warning')
        .filter({ hasText: 'Pending Handover Document' })
        .first();
      await expect(alert).toBeVisible({ timeout: 15000 });
      await expect(alert).toContainText('Require Action');

      // Compliance table must be rendered
      const complianceCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Pending Handover Documents Compliance' })
        .first();
      await expect(complianceCard).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 8. Atomic Custody Transfer (Custodian A -> Custodian B)
    // -------------------------------------------------------------------------
    await test.step('Navigate to /assets and execute atomic Transfer to second employee', async () => {
      await page.goto('/assets');
      await page.waitForLoadState('networkidle');

      // Search for our created unit
      const searchInput = page
        .locator('input[placeholder*="Search tag"], input[placeholder*="Search by"]')
        .first();
      await expect(searchInput).toBeVisible({ timeout: 20000 });
      await searchInput.fill(testTagPrefix);
      await expect(page.locator('.ant-table-wrapper .ant-spin-spinning')).not.toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(600);

      const assetRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: testTagPrefix })
        .first();
      await expect(assetRow).toBeVisible({ timeout: 15000 });
      await expect(assetRow).toContainText('Pending Record');

      // Click Transfer button (Swap icon)
      const transferBtn = assetRow.locator('button:has(.anticon-swap)').first();
      await transferBtn.click();

      const transferDrawer = page
        .locator('.ant-drawer:visible')
        .filter({ hasText: 'Transfer Asset Custody' });
      await expect(transferDrawer).toBeVisible({ timeout: 10000 });

      // Target Recipient Employee
      const toUserSelect = transferDrawer.locator('.ant-select:has(#toUserId)').first();
      await expect(toUserSelect).toBeVisible({ timeout: 10000 });
      await expect(toUserSelect).not.toHaveClass(/ant-select-loading/, { timeout: 10000 });
      await page.waitForTimeout(600); // allow drawer slide-in animation to settle
      await toUserSelect.click();

      const dropdown = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
        .first();
      await expect(dropdown).toBeVisible({ timeout: 10000 });
      const targetOption = dropdown.locator('.ant-select-item-option').first();
      await expect(targetOption).toBeVisible({ timeout: 10000 });
      await targetOption.click();
      await expect(
        transferDrawer
          .locator('.ant-alert-success, .ant-select:has(#toUserId) .ant-select-selection-item')
          .first(),
      ).toBeVisible({ timeout: 5000 });

      // Execute custody transfer
      const executeBtn = transferDrawer.getByRole('button', { name: 'Execute Custody Transfer' });
      await expect(executeBtn).toBeEnabled();
      await executeBtn.click();

      // Wait for success toast
      await expect(
        page.locator('.ant-message-success').filter({ hasText: 'transferred to' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(transferDrawer).not.toBeVisible();
    });

    // -------------------------------------------------------------------------
    // 9. Upload Signed Handover Document in Detail Drawer
    // -------------------------------------------------------------------------
    await test.step('Upload verified signed document to clear pending compliance badge', async () => {
      const assetRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: testTagPrefix })
        .first();
      await expect(assetRow).toBeVisible({ timeout: 10000 });

      // Click View Details (Eye icon)
      const detailBtn = assetRow.locator('button:has(.anticon-eye)').first();
      await detailBtn.click();

      const detailDrawer = page.locator('.ant-drawer:visible').filter({ hasText: testTagPrefix });
      await expect(detailDrawer).toBeVisible({ timeout: 10000 });

      // Verify Pending Handover Record alert is inside drawer
      const drawerAlert = detailDrawer
        .locator('.ant-alert-warning')
        .filter({ hasText: 'Pending Handover Record' });
      await expect(drawerAlert).toBeVisible();

      // Upload signed document via file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await drawerAlert.getByRole('button', { name: 'Upload Signed Document' }).click();
      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles({
        name: 'verified_signed_handover.pdf',
        mimeType: 'application/pdf',
        buffer: createMockPdfBuffer('Verified Handover Signature Approval'),
      });

      // Verify success message and clearance of pending alert
      await expect(
        page
          .locator('.ant-message-success')
          .filter({ hasText: 'Signed handover document uploaded' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(drawerAlert).not.toBeVisible({ timeout: 10000 });

      // Close details drawer
      await detailDrawer
        .locator('.ant-drawer-close, button[aria-label="Close"], button:has-text("Close")')
        .first()
        .click();
    });

    // -------------------------------------------------------------------------
    // 10. Return Unit back to warehouse stock (IN_USE -> AVAILABLE)
    // -------------------------------------------------------------------------
    await test.step('Return unit back to warehouse stock and verify inventory synchronization', async () => {
      const assetRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: testTagPrefix })
        .first();
      await expect(assetRow).toBeVisible({ timeout: 10000 });

      // Click Return button (Rollback icon)
      const returnBtn = assetRow.locator('button:has(.anticon-rollback)').first();
      await returnBtn.click();

      const returnDrawer = page
        .locator('.ant-drawer:visible')
        .filter({ hasText: 'Return Hardware Asset' });
      await expect(returnDrawer).toBeVisible({ timeout: 10000 });

      // Confirm Return
      const confirmReturnBtn = returnDrawer.getByRole('button', { name: 'Confirm Return' });
      await expect(confirmReturnBtn).toBeEnabled();
      await confirmReturnBtn.click();

      await expect(
        page
          .locator('.ant-message-success')
          .filter({ hasText: 'successfully returned to storage' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(returnDrawer).not.toBeVisible();

      // Navigate back to /inventory to verify stock replenishment
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[placeholder*="Search by SKU"]').first();
      await searchInput.fill(testModelCode);
      await page.waitForTimeout(500);

      const modelRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: testModelCode })
        .first();
      await expect(modelRow).toBeVisible({ timeout: 10000 });
      // Available units must have replenished (at least 1 in stock)
      await expect(modelRow).toContainText('1 in stock');
      await expect(modelRow).toContainText('Avail: 1');
    });
  });

  test.afterAll(async () => {
    try {
      const { exec } = await import('node:child_process');
      await new Promise<void>((resolve) => {
        exec(
          `docker exec -i uims-postgres psql -U uims -d uims_db -c "DELETE FROM \\"Asset\\" WHERE \\"assetTag\\" LIKE 'AST-E2E-${runId}-%'; DELETE FROM \\"DeviceModel\\" WHERE \\"modelCode\\" = 'MOD-E2E-${runId}';"`,
          () => resolve(),
        );
      });
    } catch {
      // Best-effort cleanup of test fixtures
    }
  });
});
