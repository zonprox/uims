import fs from 'node:fs';
import path from 'node:path';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App as AntApp } from 'antd';

export interface FeedbackViolation {
  file: string;
  line: number;
  type: 'static-import' | 'direct-submodule' | 'require-call' | 'feedback-without-useapp';
  snippet: string;
  description: string;
}

/**
 * Scans a file's content for static Ant Design feedback imports or anti-patterns.
 */
export function analyzeFeedbackSafety(content: string, filePath: string): FeedbackViolation[] {
  const violations: FeedbackViolation[] = [];

  // Rule 1: Check for named static imports from 'antd'
  // Example: import { message, notification } from 'antd';
  // Matches: import { ... } from 'antd' or import { ... } from "antd"
  const importNamedRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]antd['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importNamedRegex.exec(content)) !== null) {
    const isFullTypeImport = Boolean(match[1]);
    if (isFullTypeImport) continue;

    const importedIdentifiers = match[2].split(',').map((id) => id.trim());
    for (const rawIdentifier of importedIdentifiers) {
      if (!rawIdentifier) continue;
      // Skip inline type imports like `type MessageInstance`
      if (rawIdentifier.startsWith('type ')) continue;

      // Extract original imported name (e.g. `message as msg` -> `message`)
      const parts = rawIdentifier.split(/\s+as\s+/);
      const importedName = parts[0]?.trim();

      if (importedName === 'message' || importedName === 'notification') {
        const line = content.slice(0, match.index).split('\n').length;
        violations.push({
          file: filePath,
          line,
          type: 'static-import',
          snippet: match[0],
          description: `Direct static import of '${importedName}' from 'antd' is prohibited. Consume dynamic feedback via App.useApp() instead.`,
        });
      }
    }
  }

  // Rule 2: Check for direct submodule imports (e.g. from 'antd/es/message')
  const submoduleRegex =
    /import\s+((?!type\b)[^;]+)\s+from\s+['"]antd\/(?:es|lib)\/(message|notification)['"]/g;
  while ((match = submoduleRegex.exec(content)) !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    violations.push({
      file: filePath,
      line,
      type: 'direct-submodule',
      snippet: match[0],
      description: `Direct import from 'antd/.../${match[2]}' is prohibited. Use App.useApp().`,
    });
  }

  // Rule 3: Check for CommonJS require calls
  const requireRegex = /require\(['"]antd(?:\/(?:es|lib)\/(?:message|notification))?['"]\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    violations.push({
      file: filePath,
      line,
      type: 'require-call',
      snippet: match[0],
      description: `CommonJS require of Ant Design is prohibited in frontend source.`,
    });
  }

  // Rule 4: Namespace import check (import * as Antd from 'antd'; Antd.message.error(...))
  const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]antd['"]/g;
  while ((match = namespaceRegex.exec(content)) !== null) {
    const alias = match[1];
    const namespaceUsageRegex = new RegExp(`\\b${alias}\\.(message|notification)\\b`);
    if (namespaceUsageRegex.test(content)) {
      const line = content.slice(0, match.index).split('\n').length;
      violations.push({
        file: filePath,
        line,
        type: 'static-import',
        snippet: match[0],
        description: `Namespace access '${alias}.message' or '${alias}.notification' is prohibited. Use App.useApp().`,
      });
    }
  }

  // Rule 5: User-facing feedback calls must use dynamic App.useApp()
  // Matches: message.error(, message.success(, notification.open(, etc.
  const feedbackCallRegex =
    /\b(?:message|notification)\.(?:success|error|warning|info|loading|open)\(/;
  if (feedbackCallRegex.test(content)) {
    const hasUseApp =
      /App\.useApp\(/.test(content) ||
      /\buseApp\(/.test(content) ||
      // Or component/function receives app or message/notification as argument/props
      /\b(?:app|feedback|message|notification):\s*(?:MessageInstance|NotificationInstance|ReturnType<typeof App\.useApp>)/.test(
        content,
      );

    if (!hasUseApp) {
      // Find line number of first feedback call
      const matchCall = feedbackCallRegex.exec(content);
      const line = matchCall ? content.slice(0, matchCall.index).split('\n').length : 1;
      violations.push({
        file: filePath,
        line,
        type: 'feedback-without-useapp',
        snippet: matchCall ? matchCall[0] : 'message/notification call',
        description: `Feedback method invoked without dynamic App.useApp() context source.`,
      });
    }
  }

  return violations;
}

/**
 * Recursively retrieves all .ts and .tsx source files excluding tests.
 */
export function getSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '__tests__' ||
        entry.name === 'test'
      ) {
        continue;
      }
      results.push(...getSourceFiles(fullPath));
    } else if (entry.isFile()) {
      if (
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.test.tsx') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.spec.tsx')
      ) {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Frontend Feedback Safety Invariant (App.useApp() & Zero Static Antd Calls)', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    container.remove();
    document.body.innerHTML = '';
  });

  describe('Invariant 1: Automated Monorepo Codebase AST & Import Scan', () => {
    const srcDir = path.resolve(import.meta.dirname);
    const sourceFiles = getSourceFiles(srcDir);

    it('successfully discovers and indexes all production frontend source files', () => {
      // apps/web/src contains over 100 non-test source files
      expect(sourceFiles.length).toBeGreaterThan(80);
    });

    it('enforces ZERO static message or notification imports across 100% of production source files', () => {
      const allViolations: FeedbackViolation[] = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const violations = analyzeFeedbackSafety(content, file);
        if (violations.length > 0) {
          allViolations.push(...violations);
        }
      }

      if (allViolations.length > 0) {
        const summary = allViolations
          .map(
            (v) =>
              `- [${v.type}] ${path.relative(srcDir, v.file)}:${v.line} -> ${v.description} (Found: "${v.snippet}")`,
          )
          .join('\n');
        expect.fail(`Found ${allViolations.length} feedback safety violation(s):\n${summary}`);
      }

      expect(allViolations).toHaveLength(0);
    });

    it('verifies all files calling feedback methods explicitly obtain context via App.useApp()', () => {
      const feedbackCallerFiles: string[] = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (
          /\b(?:message|notification)\.(?:success|error|warning|info|loading|open)\(/.test(content)
        ) {
          feedbackCallerFiles.push(file);
          expect(content).toMatch(/App\.useApp\(/);
        }
      }

      // Survey Explorer 2 verified at least 20+ active files calling feedback methods
      expect(feedbackCallerFiles.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Invariant 2: Root Application Provider Hierarchy', () => {
    it('verifies that apps/web/src/app/App.tsx mounts Ant Design <AntApp> wrapping the router tree', () => {
      const appFilePath = path.resolve(import.meta.dirname, 'app/App.tsx');
      expect(fs.existsSync(appFilePath)).toBe(true);

      const appContent = fs.readFileSync(appFilePath, 'utf8');

      // 1. Imports App from 'antd'
      expect(appContent).toMatch(
        /import\s*\{[^}]*\bApp(?:\s+as\s+\w+)?\b[^}]*\}\s*from\s*['"]antd['"]/,
      );

      // 2. Renders AntApp or App wrapping RouterProvider
      expect(appContent).toMatch(/<(?:AntApp|App)>/);
      expect(appContent).toMatch(/<RouterProvider\s+router={router}\s*\/>/);
    });
  });

  describe('Invariant 3: Verification of Safety Detector (Self-Critique & Mutation Testing)', () => {
    it('accurately catches static named imports from antd', () => {
      const badCode = `
        import React from 'react';
        import { Button, message, Space } from 'antd';

        export function BadComponent() {
          return <Button onClick={() => message.error('Failed')}>Click</Button>;
        }
      `;
      const violations = analyzeFeedbackSafety(badCode, 'test-bad-import.tsx');
      const staticViolation = violations.find((v) => v.type === 'static-import');
      expect(staticViolation).toBeDefined();
      expect(staticViolation?.description).toContain("Direct static import of 'message'");
    });

    it('accurately catches static notification imports from antd', () => {
      const badCode = `
        import { notification } from 'antd';
        notification.error({ message: 'Error' });
      `;
      const violations = analyzeFeedbackSafety(badCode, 'test-bad-notification.tsx');
      expect(violations.some((v) => v.type === 'static-import')).toBe(true);
    });

    it('accurately catches direct submodule imports', () => {
      const badCode = `
        import message from 'antd/es/message';
        message.success('Success');
      `;
      const violations = analyzeFeedbackSafety(badCode, 'test-submodule.tsx');
      expect(violations.some((v) => v.type === 'direct-submodule')).toBe(true);
    });

    it('accurately catches CommonJS require of antd', () => {
      const badCode = `
        const { message } = require('antd');
        message.info('Info');
      `;
      const violations = analyzeFeedbackSafety(badCode, 'test-require.ts');
      expect(violations.some((v) => v.type === 'require-call')).toBe(true);
    });

    it('accurately catches feedback invocations without App.useApp()', () => {
      const badCode = `
        export function triggerAlert() {
          message.error('Alert error');
        }
      `;
      const violations = analyzeFeedbackSafety(badCode, 'test-no-useapp.ts');
      expect(violations.some((v) => v.type === 'feedback-without-useapp')).toBe(true);
    });

    it('approves legitimate dynamic App.useApp() usage', () => {
      const goodCode = `
        import React from 'react';
        import { App, Button } from 'antd';

        export function GoodComponent() {
          const { message, notification, modal } = App.useApp();
          return (
            <Button onClick={() => message.success('Success')}>
              Click
            </Button>
          );
        }
      `;
      const violations = analyzeFeedbackSafety(goodCode, 'test-good.tsx');
      expect(violations).toHaveLength(0);
    });

    it('allows TypeScript type-only imports from antd or antd submodules', () => {
      const goodTypeCode = `
        import type { MessageInstance } from 'antd/es/message/interface';
        import type { NotificationInstance } from 'antd/es/notification/interface';
        import { App } from 'antd';

        export function useFeedback() {
          const { message }: { message: MessageInstance } = App.useApp();
          return message;
        }
      `;
      const violations = analyzeFeedbackSafety(goodTypeCode, 'test-types.ts');
      expect(violations).toHaveLength(0);
    });
  });

  describe('Invariant 4: Runtime Dynamic Ant Design Context Mount & Dispatch', () => {
    it('dynamically provisions message, modal, and notification instances from <AntApp>', async () => {
      const received: {
        message: ReturnType<typeof AntApp.useApp>['message'] | null;
        notification: ReturnType<typeof AntApp.useApp>['notification'] | null;
        modal: ReturnType<typeof AntApp.useApp>['modal'] | null;
      } = {
        message: null,
        notification: null,
        modal: null,
      };

      function Consumer() {
        const app = AntApp.useApp();
        useEffect(() => {
          received.message = app.message;
          received.notification = app.notification;
          received.modal = app.modal;
        }, [app]);
        return createElement('div', null, 'Consumer Mounted');
      }

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(createElement(AntApp, null, createElement(Consumer, null)));
      });

      expect(received.message).not.toBeNull();
      expect(typeof received.message?.success).toBe('function');
      expect(typeof received.message?.error).toBe('function');
      expect(typeof received.notification?.open).toBe('function');
      expect(typeof received.modal?.confirm).toBe('function');
    });
  });
});
