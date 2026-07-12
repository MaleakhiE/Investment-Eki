import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsGroup, SettingsRow } from './SettingsGroup';
it('renders grouped settings', () => { const html = renderToStaticMarkup(React.createElement(SettingsGroup, { title: 'Preferences' }, React.createElement(SettingsRow, { label: 'AI recommendations', value: 'On' }))); expect(html).toContain('Preferences'); expect(html).toContain('AI recommendations'); });
