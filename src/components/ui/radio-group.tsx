// src/components/ui/radio-group.tsx
import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "flex w-full items-center gap-2 rounded-sm border border-border bg-surface/40 px-3 py-2 text-left text-xs outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="grid size-3 place-items-center rounded-full border border-primary"
      >
        <RadioGroupPrimitive.Indicator className="size-1.5 rounded-full bg-primary" />
      </span>
      {children}
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
