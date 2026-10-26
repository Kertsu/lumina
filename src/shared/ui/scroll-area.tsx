import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import type { ComponentProps, Ref } from "react";
import { cn } from "@/shared/ui/utils";

type ScrollAreaProps = ComponentProps<typeof ScrollAreaPrimitive.Root> & {
    viewportClassName?: string;
    viewportRef?: Ref<HTMLDivElement>;
};

export function ScrollArea({
    children,
    className,
    viewportClassName,
    viewportRef,
    ...props
}: ScrollAreaProps) {
    return (
        <ScrollAreaPrimitive.Root
            data-slot="scroll-area"
            type="auto"
            className={cn("relative overflow-hidden", className)}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                ref={viewportRef}
                data-slot="scroll-area-viewport"
                className={cn(
                    "size-full rounded-[inherit] outline-none",
                    viewportClassName
                )}
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
                data-slot="scroll-area-scrollbar"
                orientation="vertical"
                className="scroll-area-scrollbar"
            >
                <ScrollAreaPrimitive.Thumb
                    data-slot="scroll-area-thumb"
                    className="scroll-area-thumb"
                />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
        </ScrollAreaPrimitive.Root>
    );
}
