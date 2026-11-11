import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Drawer } from "@astryxdesign/core/Drawer";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import type { DialogProps } from "./dialog";
import { useSurfaceFocus } from "./surface-focus";

export function Sheet({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    showCloseButton = true,
    side = "right",
    onOpened,
    onClosed,
}: Omit<DialogProps, "title"> & { title: string; side?: "left" | "right" }) {
    useSurfaceFocus(open, onOpened, onClosed);
    return (
        <Drawer
            isOpen={open}
            onOpenChange={onOpenChange}
            side={side === "left" ? "start" : "end"}
            label={title}
            width="min(400px, 90vw)"
            className={className}
        >
            <Layout
                header={
                    <DialogHeader
                        title={title}
                        subtitle={description}
                        onOpenChange={
                            showCloseButton ? onOpenChange : undefined
                        }
                    />
                }
                content={
                    <LayoutContent
                        className="app-sheet-body"
                        isScrollable={false}
                    >
                        {children}
                    </LayoutContent>
                }
            />
        </Drawer>
    );
}
