
import * as React from "react"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary" | "accent" | "default"
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16"
}

const variantClasses = {
  default: "border-current border-t-transparent",
  primary: "border-primary border-t-transparent",
  secondary: "border-secondary border-t-transparent",
  accent: "border-accent border-t-transparent"
}

export function Spinner({ 
  className, 
  size = "md", 
  variant = "default", 
  ...props 
}: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
