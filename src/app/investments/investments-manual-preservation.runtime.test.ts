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

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === '/api/gold-price') {
        throw new Error('gold price unavailable');
      }
      if (url === '/api/investments/GOLD/history' || url === '/api/investments/MUTUAL_FUND/history') {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;
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
    await act(async () => {
      root.render(React.createElement(InvestmentsPage));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
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
});
