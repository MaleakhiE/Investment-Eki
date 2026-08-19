/** @jest-environment jsdom */

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'authenticated' }),
}));

jest.mock('@/components/layout/Sidebar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/providers/FeedbackProvider', () => ({
  useFeedback: () => ({
    showFeedback: () => Promise.resolve(),
    confirmAction: () => Promise.resolve(true),
  }),
}));

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import InvestmentsPage from './page';

function jsonResponse(responseDetails: unknown) {
  return {
    ok: true,
    json: async () => ({ responseStatus: 'SUCCESS', responseDetails }),
  } as Response;
}

const verifiedGoldResponse = jsonResponse({
  sell_price: 1523200,
  source: 'frankfurter.app',
  updated_at: '2026-08-19T05:00:00.000Z',
  is_verified: true,
});

const unverifiedGoldResponse = jsonResponse({
  sell_price: 1550000,
  source: 'default (offline)',
  updated_at: '2026-08-19T05:00:00.000Z',
  is_verified: false,
});

function setNativeValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (prototypeSetter && prototypeSetter !== valueSetter) {
    prototypeSetter.call(element, value);
  } else {
    valueSetter?.call(element, value);
  }
}

type GoldFetchResult = Response | Error | Promise<Response>;

function configureFetch(goldResults: GoldFetchResult[]) {
  const pendingGoldResults = [...goldResults];
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = input.toString();
    if (url === '/api/gold-price') {
      const nextResult = pendingGoldResults.shift();
      if (!nextResult) throw new Error('unexpected gold price request');
      const resolved = await nextResult;
      if (resolved instanceof Error) throw resolved;
      return resolved;
    }
    if (url === '/api/investments/GOLD/history' || url === '/api/investments/MUTUAL_FUND/history') {
      return jsonResponse([]);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;
}

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('investments page manual-entry preservation', () => {
  const originalFetch = global.fetch;
  const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let originalActEnvironment: boolean | undefined;
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    originalActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  afterAll(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it('preserves a manually entered current value across a failed gold refresh', async () => {
    configureFetch([new Error('gold price unavailable'), new Error('gold price unavailable')]);

    await act(async () => {
      root.render(React.createElement(InvestmentsPage));
      await flushEffects();
    });

    const currentValue = container.querySelector<HTMLInputElement>('#investment-current-value');
    expect(currentValue).not.toBeNull();
    expect(currentValue?.disabled).toBe(false);

    await act(async () => {
      setNativeValue(currentValue!, '12345');
      currentValue!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(currentValue!.value).toBe('12.345');

    const refreshButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Refresh') as HTMLButtonElement | undefined;
    expect(refreshButton).toBeDefined();

    await act(async () => {
      refreshButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(currentValue!.value).toBe('12.345');
  });

  it('keeps currentValue editable when gold price returns unverified', async () => {
    // Unverified response should not enable calculator and should allow manual entry
    configureFetch([unverifiedGoldResponse]);

    await act(async () => {
      root.render(React.createElement(InvestmentsPage));
      await flushEffects();
    });

    const currentValue = container.querySelector<HTMLInputElement>('#investment-current-value');
    expect(currentValue).not.toBeNull();
    expect(currentValue?.disabled).toBe(false);

    // The calculator inputs should not be visible because useGoldCalc starts false
    const calculatorInputs = container.querySelectorAll('#gold-price, #gold-grams');
    expect(calculatorInputs.length).toBe(0);

    // The toggle should be disabled because the price is unverified
    const toggle = container.querySelector('button[role="switch"]') as HTMLButtonElement | undefined;
    expect(toggle).toBeDefined();
    expect(toggle?.hasAttribute('disabled')).toBe(true);
  });

  it('keeps currentValue editable while a verified price refresh is loading', async () => {
    let resolveRefresh!: (value: Response) => void;
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    configureFetch([verifiedGoldResponse, refreshPromise]);

    await act(async () => {
      root.render(React.createElement(InvestmentsPage));
      await flushEffects();
    });

    const currentValue = container.querySelector<HTMLInputElement>('#investment-current-value');
    expect(currentValue).not.toBeNull();
    expect(currentValue?.disabled).toBe(true);

    const refreshButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Refresh') as HTMLButtonElement | undefined;
    expect(refreshButton).toBeDefined();

    await act(async () => {
      refreshButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelectorAll('#gold-price, #gold-grams').length).toBe(0);
    expect(currentValue?.disabled).toBe(false);
    const toggle = container.querySelector('button[role="switch"]') as HTMLButtonElement | undefined;
    expect(toggle?.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      resolveRefresh(unverifiedGoldResponse);
      await flushEffects();
    });

    expect(currentValue?.disabled).toBe(false);
    expect(toggle?.hasAttribute('disabled')).toBe(true);
  });

  it('user can toggle calculator when price becomes verified', async () => {
    // First load: unverified
    // Then: verified (allowing toggle enablement)
    configureFetch([unverifiedGoldResponse, verifiedGoldResponse]);

    // Initial load with unverified price
    await act(async () => {
      root.render(React.createElement(InvestmentsPage));
      await flushEffects();
    });

    // Toggle is disabled while unverified
    const toggle = container.querySelector('button[role="switch"]') as HTMLButtonElement | undefined;
    expect(toggle?.hasAttribute('disabled')).toBe(true);

    // Trigger a refresh (simulating user click)
    const refreshButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Refresh');
    expect(refreshButton).toBeDefined();

    await act(async () => {
      refreshButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    // After loading verified price, toggle becomes enabled
    expect(toggle?.hasAttribute('disabled')).toBe(false);
  });
});
