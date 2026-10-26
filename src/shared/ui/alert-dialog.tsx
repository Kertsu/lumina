import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/utils";

export function AlertDialog(
    props: ComponentProps<typeof AlertDialogPrimitive.Root>
) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

export function AlertDialogTrigger(
    props: ComponentProps<typeof AlertDialogPrimitive.Trigger>
) {
    return (
        <AlertDialogPrimitive.Trigger
            data-slot="alert-dialog-trigger"
            {...props}
        />
    );
}

export function AlertDialogContent({
    className,
    ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
    return (
        <AlertDialogPrimitive.Portal>
            <AlertDialogPrimitive.Overlay
                data-slot="alert-dialog-overlay"
                className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
            />
            <AlertDialogPrimitive.Content
                data-slot="alert-dialog-content"
                className={cn(
                    "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[14px] border border-border bg-popover p-6 text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    className
                )}
                {...props}
            />
        </AlertDialogPrimitive.Portal>
    );
}

export function AlertDialogHeader({
    className,
    ...props
}: ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-dialog-header"
            className={cn("flex flex-col gap-2", className)}
            {...props}
        />
    );
}

export function AlertDialogFooter({
    className,
    ...props
}: ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-dialog-footer"
            className={cn(
                "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className
            )}
            {...props}
        />
    );
}

export function AlertDialogTitle({
    className,
    ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
    return (
        <AlertDialogPrimitive.Title
            data-slot="alert-dialog-title"
            className={cn("text-lg font-semibold tracking-tight", className)}
            {...props}
        />
    );
}

export function AlertDialogDescription({
    className,
    ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
    return (
        <AlertDialogPrimitive.Description
            data-slot="alert-dialog-description"
            className={cn(
                "text-sm leading-relaxed text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}

export function AlertDialogAction({
    className,
    ...props
}: ComponentProps<typeof AlertDialogPrimitive.Action>) {
    return (
        <Button asChild className={className}>
            <AlertDialogPrimitive.Action
                data-slot="alert-dialog-action"
                {...props}
            />
        </Button>
    );
}

export function AlertDialogCancel({
    className,
    ...props
}: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
    return (
        <Button asChild variant="outline" className={className}>
            <AlertDialogPrimitive.Cancel
                data-slot="alert-dialog-cancel"
                {...props}
            />
        </Button>
    );
}
