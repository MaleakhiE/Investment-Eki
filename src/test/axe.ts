import { expect } from '@jest/globals';
import { axe, toHaveNoViolations, type AxeResults } from 'jest-axe';

// Registers the shared jest-axe matcher so every a11y smoke test can assert
// `expect(violations).toHaveNoViolations()`. Call once per test file (idempotent).
export function setupAxe() {
  expect.extend(toHaveNoViolations);
}

// Runs axe against a live DOM container and asserts zero violations.
export async function expectNoAxeViolations(container: Element): Promise<AxeResults> {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
  return results;
}

export { axe, toHaveNoViolations };
