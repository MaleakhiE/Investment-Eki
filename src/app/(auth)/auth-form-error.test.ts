import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FormError from '@/components/ui/FormError';

it('announces inline validation errors to assistive technology', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      FormError,
      null,
      React.createElement('p', { className: 'text-sm' }, 'Passwords do not match'),
    ),
  );

  // The error node must be exposed as an assertion-level alert region so
  // screen readers announce validation failures the moment they appear.
  expect(html).toContain('role="alert"');
  expect(html).toContain('aria-live="assertive"');
  expect(html).toContain('Passwords do not match');
});

it('preserves the error visual styling by default', () => {
  const html = renderToStaticMarkup(
    React.createElement(FormError, null, React.createElement('p', null, 'Weak password')),
  );

  // Keeping the existing red-tinted container look.
  expect(html).toContain('bg-red-500/10');
  expect(html).toContain('border-red-500/20');
});

it('allows a custom className without losing the alert semantics', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      FormError,
      { className: 'my-custom-error', children: React.createElement('p', null, 'Invalid token') },
    ),
  );

  expect(html).toContain('role="alert"');
  expect(html).toContain('aria-live="assertive"');
  expect(html).toContain('my-custom-error');
});
