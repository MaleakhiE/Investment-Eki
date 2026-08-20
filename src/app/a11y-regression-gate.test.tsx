/**
 * @jest-environment jsdom
 *
 * OBJ-105 — Automated accessibility regression gate.
 *
 * Smoke render tests asserting zero axe violations on the shared structural
 * components that constitute every primary route's a11y contract:
 *  - PageHeader: used by budget, goals, analytics, cashflow, settings
 *  - AuthShell:  used by login, register, reset-password, forgot-password
 *
 * These render real DOM in jsdom so axe can scan landmark, heading, name/role,
 * and color-contrast-independent structure. Per-page route modules delegate their
 * a11y-critical chrome to these shared components, so a violation here surfaces
 * across all primary routes.
 */
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import PageHeader from '@/components/ui/PageHeader';
import AuthShell from '@/components/auth/AuthShell';
import { setupAxe, expectNoAxeViolations } from '@/test/axe';

setupAxe();

const ACTION = <button type="button">Create</button>;

describe('OBJ-105: axe smoke render — primary route chrome', () => {
  it('PageHeader (authenticated routes) has no axe violations', async () => {
    const { container } = render(
      <PageHeader
        eyebrow="Planning"
        title="Budget"
        description="Set spending limits per category"
        action={ACTION}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('AuthShell (auth routes) has no axe violations including an alert region', async () => {
    const { container } = render(
      <AuthShell title="Welcome back" description="Sign in to review your finances.">
        <form aria-label="Sign in">
          <input aria-label="Email" />
          <input aria-label="Password" type="password" />
        </form>
        <div role="alert" aria-live="assertive">
          <p>Invalid credentials</p>
        </div>
      </AuthShell>,
    );
    await expectNoAxeViolations(container);
  });
});
