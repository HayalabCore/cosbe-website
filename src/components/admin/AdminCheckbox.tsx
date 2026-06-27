'use client';

type Props = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
};

/**
 * Shared admin checkbox — a fully controlled custom control (solid primaryColor
 * box + crisp white check/dash) instead of the browser's inconsistent
 * `accent-color`. Used across the dashboard and bulk-import tables.
 */
export default function AdminCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className,
}: Props) {
  const active = checked || Boolean(indeterminate);
  return (
    <label
      className={`relative inline-flex items-center justify-center ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${className ?? ''}`}
    >
      <input
        type="checkbox"
        aria-label={ariaLabel}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate) && !checked;
        }}
        onChange={onChange}
      />
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primaryColor/30 ${
          active
            ? 'border-primaryColor bg-primaryColor'
            : 'border-slate-300 bg-white'
        }`}
      >
        {checked ? (
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : indeterminate ? (
          <span className="h-0.5 w-2.5 rounded-full bg-white" />
        ) : null}
      </span>
    </label>
  );
}
