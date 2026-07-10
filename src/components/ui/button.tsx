import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[color,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[--bg-root] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[--accent] text-white hover:bg-[--accent-hover]",
        destructive: "bg-[--destructive] text-white hover:brightness-110",
        outline: "border border-[--border-default] bg-[--bg-elevated] text-[--text-primary] hover:border-[--border-hover] hover:bg-[--bg-hover]",
        secondary: "border border-[--border-default] bg-[--bg-elevated] text-[--text-primary] hover:bg-[--bg-hover]",
        ghost: "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]",
        link: "text-[--link] underline-offset-4 hover:underline",
        upvote: "bg-transparent text-[--text-secondary] hover:bg-[--upvote]/10 hover:text-[--upvote]",
        downvote: "bg-transparent text-[--text-secondary] hover:bg-[--downvote]/10 hover:text-[--downvote]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
