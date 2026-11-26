import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
}

export function Select({ className, options, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-9 rounded-lg bg-[var(--color-panel)] border border-transparent text-sm text-[var(--color-text)] outline-none transition cursor-pointer focus:border-[var(--color-accent-3)]',
        className,
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
