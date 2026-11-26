import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: React.ReactNode
}

export function Input({ className, prefixIcon, ...props }: InputProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      {prefixIcon && <span className="absolute left-2.5 text-[var(--color-text-muted)]">{prefixIcon}</span>}
      <input
        className={cn(
          'h-9 w-full rounded-lg bg-[var(--color-panel)] border border-transparent px-3 text-sm text-[var(--color-text)] outline-none transition placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent-3)]',
          prefixIcon && 'pl-9',
          className,
        )}
        {...props}
      />
    </div>
  )
}
