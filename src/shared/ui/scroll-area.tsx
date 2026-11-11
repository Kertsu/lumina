import { ScrollableArea } from "@astryxdesign/core/ScrollableArea";
import type { ComponentProps, Ref } from "react";

export function ScrollArea({
    children,
    className,
    viewportClassName,
    viewportRef,
    ...props
}: Omit<ComponentProps<"div">, "role" | "tabIndex" | "aria-label"> & {
    viewportClassName?: string;
    viewportRef?: Ref<HTMLDivElement>;
}) {
    return (
        <div className={className}>
            <ScrollableArea
                {...props}
                label="Chapter verses"
                ref={viewportRef}
                className={viewportClassName}
                height="100%"
            >
                {children}
            </ScrollableArea>
        </div>
    );
}
