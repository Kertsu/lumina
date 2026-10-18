import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetContent({
    side = "right",
    className,
    children,
    showCloseButton = true,
    ...props
}: ComponentProps<typeof SheetPrimitive.Content> & {
    side?: "left" | "right";
    showCloseButton?: boolean;
}) {
    return (
        <SheetPrimitive.Portal>
            <SheetPrimitive.Overlay
                data-slot="sheet-overlay"
                className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            />
            <SheetPrimitive.Content
                data-slot="sheet-content"
                data-side={side}
                className={cn(
                    "fixed inset-y-0 z-50 flex h-dvh w-[min(400px,90vw)] flex-col bg-card text-card-foreground shadow-2xl outline-none",
                    side === "left"
                        ? "left-0 border-r border-border"
                        : "right-0 border-l border-border",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <SheetPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <X className="size-4" />
                        <span className="sr-only">Close panel</span>
                    </SheetPrimitive.Close>
                )}
            </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
    );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
    return (
        <div
            data-slot="sheet-header"
            className={cn("flex shrink-0 flex-col gap-2 p-5 pr-12", className)}
            {...props}
        />
    );
}

export function SheetTitle({
    className,
    ...props
}: ComponentProps<typeof SheetPrimitive.Title>) {
    return (
        <SheetPrimitive.Title
            data-slot="sheet-title"
            className={cn("font-serif text-2xl font-semibold", className)}
            {...props}
        />
    );
}

export function SheetDescription({
    className,
    ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
    return (
        <SheetPrimitive.Description
            data-slot="sheet-description"
            className={cn(
                "text-xs leading-relaxed text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}
