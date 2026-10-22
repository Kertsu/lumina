import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/ui/utils";

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded border border-transparent bg-clip-padding whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/80",
                outline:
                    "border-border bg-background text-foreground hover:bg-muted",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-muted hover:text-foreground",
                destructive:
                    "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "gap-2 px-4 py-2",
                sm: "h-8 gap-1 rounded px-3 text-sm",
                lg: "h-10 gap-2 rounded px-6",
                icon: "size-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export function Button({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    ...props
}: ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Component = asChild ? Slot : "button";

    return (
        <Component
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(
                buttonVariants({
                    variant,
                    size,
                    className,
                })
            )}
            {...props}
        />
    );
}
