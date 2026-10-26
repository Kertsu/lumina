import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
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
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(active && "tool-active", className)}
                    aria-label={label}
                    onClick={onClick}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
