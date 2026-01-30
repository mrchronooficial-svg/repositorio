import type { VariantProps } from "class-variance-authority";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 rounded-lg border border-transparent outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/25 hover:bg-secondary/80 hover:shadow-md hover:shadow-secondary/30 active:scale-[0.98]",
        outline:
          "border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-sm shadow-destructive/25 hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/30 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground shadow-sm shadow-success/25 hover:bg-success/90 hover:shadow-md hover:shadow-success/30 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-9 px-3",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
