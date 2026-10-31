import * as React from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "mb-1 block select-none text-[11px] font-bold leading-none",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
