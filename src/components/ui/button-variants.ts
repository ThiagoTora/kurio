import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm text-xs font-bold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "font-normal text-primary underline underline-offset-4 hover:opacity-80",
        destructive: "bg-destructive text-background hover:opacity-90",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-7 px-3 text-[11px]",
        lg: "h-10 px-6",
        icon: "size-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
