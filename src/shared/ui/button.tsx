import {
    Button as AstryxButton,
    type ButtonVariant,
} from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
    type ComponentProps,
    type ReactNode,
    useCallback,
    useState,
} from "react";

const variants = {
    default: "primary",
    secondary: "secondary",
    outline: "secondary",
    ghost: "ghost",
    destructive: "destructive",
} satisfies Record<string, ButtonVariant>;

type ButtonProps = ComponentProps<"button"> & {
    variant?: keyof typeof variants;
    size?: "default" | "sm" | "icon" | "icon-sm";
    icon?: ReactNode;
    endContent?: ReactNode;
};

/** Keep application size/intent vocabulary; Astryx owns the control and its states. */
export function Button({
    children,
    variant = "default",
    size = "default",
    disabled,
    title,
    icon,
    endContent,
    ...props
}: ButtonProps) {
    const text = typeof children === "string" ? children : undefined;
    const label = props["aria-label"] ?? text ?? title ?? "";
    const [overflowLabel, setOverflowLabel] = useState<string>();
    const measureLabel = useCallback(
        (node: HTMLSpanElement | null) => {
            if (!node) return;
            const measure = () =>
                setOverflowLabel(
                    node.scrollWidth > node.clientWidth
                        ? label || node.textContent || undefined
                        : undefined
                );
            measure();
            if (typeof ResizeObserver === "undefined") return;
            const observer = new ResizeObserver(measure);
            observer.observe(node);
            return () => observer.disconnect();
        },
        [label, children]
    );
    const shared = {
        ...props,
        label,
        variant: variants[variant],
        size:
            size === "sm" || size === "icon-sm"
                ? ("sm" as const)
                : ("md" as const),
        isDisabled: disabled,
        disabled,
    };
    return size === "icon" || size === "icon-sm" ? (
        <IconButton {...shared} icon={icon ?? children} />
    ) : (
        <AstryxButton
            {...shared}
            icon={icon}
            endContent={endContent}
            tooltip={overflowLabel}
        >
            {children != null && (
                <span className="app-button-text" ref={measureLabel}>
                    {text ?? (
                        <span className="app-button-label">{children}</span>
                    )}
                </span>
            )}
        </AstryxButton>
    );
}
