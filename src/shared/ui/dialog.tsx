import {
    Dialog as AstryxDialog,
    DialogHeader,
} from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { type ReactNode, useId } from "react";
import { useSurfaceFocus } from "./surface-focus";

export type DialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    width?: number;
    className?: string;
    showCloseButton?: boolean;
    onOpened?: () => void;
    onClosed?: () => void;
};

/** Application task surface; Astryx owns modal behavior and focus containment. */
export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    width = 520,
    className,
    showCloseButton = true,
    onOpened,
    onClosed,
}: DialogProps) {
    const descriptionId = useId();
    useSurfaceFocus(open, onOpened, onClosed);
    return (
        <AstryxDialog
            isOpen={open}
            onOpenChange={onOpenChange}
            width={width}
            maxHeight="85dvh"
            className={className}
            aria-describedby={description ? descriptionId : undefined}
        >
            <Layout
                header={
                    <DialogHeader
                        title={title}
                        subtitle={
                            description ? (
                                <span id={descriptionId}>{description}</span>
                            ) : undefined
                        }
                        onOpenChange={
                            showCloseButton ? onOpenChange : undefined
                        }
                    />
                }
                content={
                    <LayoutContent className="app-dialog-body">
                        {children}
                    </LayoutContent>
                }
                footer={
                    footer && (
                        <LayoutFooter>
                            <div className="app-dialog-actions">{footer}</div>
                        </LayoutFooter>
                    )
                }
            />
        </AstryxDialog>
    );
}
