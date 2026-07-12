import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthShell from './AuthShell';

it('renders the authentication heading and description', () => {
  const html = renderToStaticMarkup(React.createElement(AuthShell, { title: 'Welcome back', description: 'Sign in securely' }, 'Form'));
  expect(html).toContain('Welcome back');
  expect(html).toContain('Sign in securely');
});
