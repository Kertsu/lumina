import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn("flex flex-col gap-4", className)}
            {...props}
        />
    );
}

export function TabsList({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                "inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}

export function TabsTrigger({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "inline-flex h-7 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium whitespace-nowrap outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                className
            )}
            {...props}
        />
    );
}

export function TabsContent({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn(
                "flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className
            )}
            {...props}
        />
    );
}
