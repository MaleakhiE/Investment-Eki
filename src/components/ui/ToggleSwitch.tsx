'use client';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  tone?: 'mint' | 'gold';
};

const ENABLED_TONES = {
  mint: {
    label: 'text-[#087f6b]',
    track: 'border-[#00b894] bg-[#00cfa5]',
    focus: 'focus-visible:ring-[#00a88a]',
  },
  gold: {
    label: 'text-[#8a620b]',
    track: 'border-[#c69218] bg-[#d6a82b]',
    focus: 'focus-visible:ring-[#b98512]',
  },
} as const;

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  tone = 'mint',
}: ToggleSwitchProps) {
  const enabledTone = ENABLED_TONES[tone];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group inline-flex min-h-11 flex-shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${enabledTone.focus}`}
    >
      <span className={`min-w-5 text-right text-xs font-semibold ${checked ? enabledTone.label : 'text-[#667c78]'}`}>
        {checked ? 'On' : 'Off'}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 rounded-full border transition-colors ${checked ? enabledTone.track : 'border-[#b8c9c5] bg-[#cbd8d5]'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}
