import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/shared/ui/utils";

export function Command({
    className,
    ...props
}: ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            data-slot="command"
            className={cn(
                "flex min-h-0 w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground",
                className
            )}
            {...props}
        />
    );
}

export function CommandInput({
    className,
    ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div
            data-slot="command-input-wrap"
            className="flex shrink-0 items-center gap-3 border-b border-border px-4 pr-12"
        >
            <Search
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
            />
            <CommandPrimitive.Input
                data-slot="command-input"
                className={cn(
                    "h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50",
                    className
                )}
                {...props}
            />
        </div>
    );
}

export function CommandList({
    className,
    ...props
}: ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            data-slot="command-list"
            className={cn(
                "max-h-[min(390px,55dvh)] scroll-py-2 overflow-x-hidden overflow-y-auto p-2",
                className
            )}
            {...props}
        />
    );
}

export function CommandEmpty(
    props: ComponentProps<typeof CommandPrimitive.Empty>
) {
    return (
        <CommandPrimitive.Empty
            data-slot="command-empty"
            className="py-10 text-center text-sm text-muted-foreground"
            {...props}
        />
    );
}

export function CommandGroup({
    className,
    ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group
            data-slot="command-group"
            className={cn(
                "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}

export function CommandItem({
    className,
    ...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item
            data-slot="command-item"
            className={cn(
                "relative flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-2.5 py-2.5 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:cursor-default data-[disabled=true]:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}

export function CommandShortcut({
    className,
    ...props
}: ComponentProps<"kbd">) {
    return (
        <kbd
            data-slot="command-shortcut"
            className={cn(
                "ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}
