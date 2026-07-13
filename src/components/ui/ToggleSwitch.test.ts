import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ToggleSwitch from './ToggleSwitch';

describe('ToggleSwitch', () => {
  it('renders an enabled accessible switch with a visible state', () => {
    const html = renderToStaticMarkup(React.createElement(ToggleSwitch, {
      checked: true,
      onChange: () => undefined,
      label: 'Enable monthly reminder',
    }));

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('On');
  });

  it('renders a disabled-state label and minimum touch target', () => {
    const html = renderToStaticMarkup(React.createElement(ToggleSwitch, {
      checked: false,
      onChange: () => undefined,
      label: 'Enable low balance alert',
      disabled: true,
    }));

    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Off');
    expect(html).toContain('min-h-11');
  });

  it('reports the next checked state when activated', () => {
    const onChange = jest.fn();
    const element = ToggleSwitch({
      checked: true,
      onChange,
      label: 'Enable monthly reminder',
    });

    element.props.onClick();

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not report a state change while disabled', () => {
    const onChange = jest.fn();
    const element = ToggleSwitch({
      checked: false,
      onChange,
      label: 'Enable low balance alert',
      disabled: true,
    });

    element.props.onClick();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders the approved gold enabled state', () => {
    const html = renderToStaticMarkup(React.createElement(ToggleSwitch, {
      checked: true,
      onChange: () => undefined,
      label: 'Use gold calculator',
      tone: 'gold',
    }));

    expect(html).toContain('border-[#c69218]');
    expect(html).toContain('bg-[#d6a82b]');
    expect(html).toContain('text-[#8a620b]');
  });
});
