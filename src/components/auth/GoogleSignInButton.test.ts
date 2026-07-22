jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import FeedbackProvider from '@/components/providers/FeedbackProvider';
import GoogleSignInButton from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('exposes Google OAuth as a distinct login action', () => {
    const html = renderToStaticMarkup(React.createElement(
      FeedbackProvider,
      null,
      React.createElement(GoogleSignInButton, { callbackUrl: '/dashboard' }),
    ));

    expect(html).toContain('type="button"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('aria-hidden="true"');
  });
});
