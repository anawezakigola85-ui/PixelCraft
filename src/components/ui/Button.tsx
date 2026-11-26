import { cn, buttonVariants, type ButtonProps } from '../../lib/utils'

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
