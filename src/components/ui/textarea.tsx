import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./field-class";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClass, "h-auto min-h-20 py-2", className)}
      {...props}
    />
  );
}

export { Textarea };
