import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/shared/ui/utils";

const buttonVariants = cva(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                outline:
                    "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
                ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            },
            size: {
                default: "h-9 px-3.5 py-2",
                sm: "h-8 gap-1.5 px-2.5 text-xs",
                icon: "size-9",
                "icon-sm": "size-8",
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
    type,
    ...props
}: ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Component = asChild ? Slot.Root : "button";
    return (
        <Component
            data-slot="button"
            data-variant={variant}
            data-size={size}
            type={asChild ? type : (type ?? "button")}
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
