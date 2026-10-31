import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./field-class";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldClass, className)}
      {...props}
    />
  );
}

export { Input };
