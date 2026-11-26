import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-3)] text-black',
        accent: 'bg-gradient-to-r from-[var(--color-accent-2)] to-[var(--color-accent-3)] text-black',
        secondary: 'bg-white/5 text-[var(--color-text)] hover:bg-white/10',
        outline: 'border border-[var(--color-border-hover)] text-[var(--color-text)] hover:bg-white/5',
        ghost: 'text-[var(--color-text)] hover:bg-white/5',
        destructive: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/30',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export { buttonVariants }
