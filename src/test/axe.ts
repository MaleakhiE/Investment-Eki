import { expect } from '@jest/globals';
import { axe, toHaveNoViolations, type AxeResults } from 'jest-axe';

// Registers the shared jest-axe matcher so `expect(results).toHaveNoViolations()`
// is available. Kept for forward-compatibility; the shared helper below also works
// without relying on the augmented-matched type.
export function setupAxe() {
  expect.extend(toHaveNoViolations);
}

// Runs axe against a live DOM container and asserts zero violations.
// Throws with a readable list of violations (impact + id + help) on failure.
export async function expectNoAxeViolations(container: Element): Promise<AxeResults> {
  const results = await axe(container);
  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `- [${v.impact ?? 'unknown'}] ${v.id}: ${v.help} (${v.helpUrl})`)
      .join('\n');
    throw new Error(
      `Expected no axe violations but found ${results.violations.length}:\n${summary}`,
    );
  }
  expect(results.violations).toHaveLength(0);
  return results;
}

export { axe, toHaveNoViolations };
