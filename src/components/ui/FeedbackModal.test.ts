import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FeedbackModal from './FeedbackModal';

describe('FeedbackModal', () => {
  it('announces an open result as an accessible modal dialog', () => {
    const html = renderToStaticMarkup(React.createElement(FeedbackModal, {
      open: true,
      tone: 'success',
      title: 'Login successful',
      message: 'Your financial dashboard is ready.',
      primaryLabel: 'Open dashboard',
      onClose: () => undefined,
    }));

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Login successful');
    expect(html).toContain('Your financial dashboard is ready.');
    expect(html).toContain('Open dashboard');
    expect(html).toContain('Success');
  });

  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(React.createElement(FeedbackModal, {
      open: false,
      title: 'Hidden feedback',
      message: 'This should not be announced.',
      onClose: () => undefined,
    }));

    expect(html).toBe('');
  });

  it('renders explicit confirm and cancel actions for destructive workflows', () => {
    const html = renderToStaticMarkup(React.createElement(FeedbackModal, {
      open: true,
      tone: 'error',
      title: 'Delete transaction?',
      message: 'This action cannot be undone.',
      primaryLabel: 'Delete',
      secondaryLabel: 'Cancel',
      onClose: () => undefined,
      onPrimaryAction: () => undefined,
      onSecondaryAction: () => undefined,
    }));

    expect(html).toContain('Delete transaction?');
    expect(html).toContain('>Delete</button>');
    expect(html).toContain('>Cancel</button>');
  });

  it('renders auto-dismiss success feedback without an action button', () => {
    const html = renderToStaticMarkup(React.createElement(FeedbackModal, {
      open: true,
      tone: 'success',
      title: 'Login successful',
      message: 'Redirecting to your dashboard.',
      autoCloseMs: 1000,
      onClose: () => undefined,
    }));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Redirecting to your dashboard.');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('Open dashboard');
  });
});
