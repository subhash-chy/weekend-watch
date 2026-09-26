/**
 * Test setup.
 *
 * Registers jest-dom's accessibility-oriented matchers (`toHaveAccessibleName`,
 * `toHaveAttribute`, …) which the component tests rely on.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount between tests so one test's DOM never leaks into the next, and so
// `document.activeElement` assertions stay meaningful.
afterEach(() => {
  cleanup();
});
