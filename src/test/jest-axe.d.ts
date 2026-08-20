declare module 'jest-axe' {
  import type { Matchers } from '@jest/expect';

  export interface AxeResults {
    violations: AxeViolation[];
    passes: AxeViolation[];
    incomplete: AxeViolation[];
    inapplicable: AxeViolation[];
  }

  export interface AxeViolation {
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: AxeNode[];
  }

  export interface AxeNode {
    any: AxeCheckResult[];
    all: AxeCheckResult[];
    none: AxeCheckResult[];
    html: string;
    target: string[];
    failureSummary: string;
    xpath: string;
  }

  export interface AxeCheckResult {
    id: string;
    impact?: 'minor' | 'moderate' | 'serious' | 'critical';
    message?: string;
    data?: Record<string, unknown>;
    relatedNodes?: AxeNode[];
  }

  export interface AxeOptions {
    runOnly?: string | string[] | { type: 'tag' | 'rule'; values: string[] };
    resultTypes?: string[];
    rules?: Record<string, { enabled: boolean }>;
    reporter?: 'v1' | 'v2' | ((results: AxeResults) => void);
    performanceTimer?: boolean;
  }

  export function axe(container: Element, options?: AxeOptions): Promise<AxeResults>;

  export const toHaveNoViolations: {
    (received: AxeResults): { pass: boolean; message: () => string };
  };
}