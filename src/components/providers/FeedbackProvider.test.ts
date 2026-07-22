import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FeedbackProvider from './FeedbackProvider';

describe('FeedbackProvider', () => {
  it('keeps application content available while no feedback is active', () => {
    const html = renderToStaticMarkup(React.createElement(
      FeedbackProvider,
      null,
      React.createElement('main', null, 'Financial dashboard'),
    ));

    expect(html).toContain('Financial dashboard');
    expect(html).not.toContain('role="dialog"');
  });
});
