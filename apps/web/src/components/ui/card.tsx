import * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  hover = false,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; hover?: boolean }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "bg-card text-card-foreground rounded-xl border border-border/50 shadow-soft",
        "transition-all duration-300",
        hover && "hover:shadow-soft-lg hover:border-border hover:-translate-y-0.5 cursor-pointer",
        "group/card flex flex-col",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "p-6 pb-4 group-data-[size=sm]/card:p-4 group-data-[size=sm]/card:pb-3",
        "grid auto-rows-min items-start gap-1.5",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        "group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-6 pb-6 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:pb-4",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "border-t border-border/50 bg-muted/30 px-6 py-4",
        "group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3",
        "flex items-center gap-4",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
