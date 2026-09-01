import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

const button = cva(
  "cursor-pointer font-sans font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-wp-accent hover:shadow-wp-accent/35 rounded-lg border-0 text-white hover:-translate-y-0.5 hover:shadow-md hover:brightness-[1.04] active:translate-y-0 active:brightness-95",
        ghost:
          "border-wp-ghost-border bg-wp-ghost-bg text-wp-ghost-text hover:border-wp-accent hover:text-wp-title rounded-lg border hover:-translate-y-0.5 active:translate-y-0",
        quiet: "text-wp-muted hover:text-wp-sub border-0 bg-transparent",
      },
      size: {
        sm: "text-[13px]",
        md: "px-6 py-2.5 text-[14px]",
        lg: "py-3 text-[15px]",
        /** Icon and label side by side. */
        pill: "flex h-10 min-w-[132px] items-center justify-center gap-2 px-4 text-[13px]",
        /** Square, icon only. */
        icon: "grid h-10 w-10 shrink-0 place-items-center",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export function Button({ variant, size, className, ...props }: Props) {
  return <button {...props} className={button({ variant, size, className })} />;
}
