import { Button } from "@/shared/ui/button";
import { Tooltip } from "@/shared/ui/tooltip";
import { cn } from "@/shared/ui/utils";

export function IconButton({
    label,
    children,
    onClick,
    active = false,
    className,
}: {
    label: string;
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    className?: string;
}) {
    return (
        <Tooltip content={label}>
            <Button
                variant="ghost"
                size="icon"
                className={cn(active && "tool-active", className)}
                aria-label={label}
                onClick={onClick}
            >
                {children}
            </Button>
        </Tooltip>
    );
}
