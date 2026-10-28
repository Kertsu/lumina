import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/shared/ui/utils";

export function ContextMenu(
    props: ComponentProps<typeof ContextMenuPrimitive.Root>
) {
    return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

export function ContextMenuTrigger(
    props: ComponentProps<typeof ContextMenuPrimitive.Trigger>
) {
    return (
        <ContextMenuPrimitive.Trigger
            data-slot="context-menu-trigger"
            {...props}
        />
    );
}

export function ContextMenuContent({
    className,
    ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content>) {
    return (
        <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content
                data-slot="context-menu-content"
                className={cn(
                    "z-50 min-w-52 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    className
                )}
                {...props}
            />
        </ContextMenuPrimitive.Portal>
    );
}

export function ContextMenuItem({
    className,
    variant = "default",
    ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item> & {
    variant?: "default" | "destructive";
}) {
    return (
        <ContextMenuPrimitive.Item
            data-slot="context-menu-item"
            data-variant={variant}
            className={cn(
                "relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive [&_svg]:size-4 [&_svg]:shrink-0",
                className
            )}
            {...props}
        />
    );
}

export function ContextMenuSeparator({
    className,
    ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
    return (
        <ContextMenuPrimitive.Separator
            data-slot="context-menu-separator"
            className={cn("-mx-1 my-1 h-px bg-border", className)}
            {...props}
        />
    );
}

export function ContextMenuShortcut({
    className,
    ...props
}: ComponentProps<"span">) {
    return (
        <span
            data-slot="context-menu-shortcut"
            className={cn(
                "ml-auto pl-5 text-xs text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}
