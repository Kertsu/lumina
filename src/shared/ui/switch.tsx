import { Switch as AstryxSwitch } from "@astryxdesign/core/Switch";
import type { ComponentProps } from "react";

type SwitchProps = Omit<ComponentProps<"input">, "onChange" | "size"> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
};

export function Switch({
    checked,
    onCheckedChange,
    disabled,
    className,
    ...props
}: SwitchProps) {
    return (
        <AstryxSwitch
            {...props}
            className={className}
            label={props["aria-label"] ?? "Preference"}
            isLabelHidden
            value={checked}
            onChange={onCheckedChange}
            isDisabled={disabled}
        />
    );
}
