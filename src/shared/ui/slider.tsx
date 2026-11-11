import { Slider as AstryxSlider } from "@astryxdesign/core/Slider";
import { type ComponentProps, useState } from "react";

type SliderProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
};

export function Slider({
    value,
    defaultValue,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    disabled,
    className,
    ...props
}: SliderProps) {
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? [min]);
    const values = value ?? uncontrolled;
    const change = (next: number | [number, number]) => {
        const result = typeof next === "number" ? [next] : next;
        setUncontrolled(result);
        onValueChange?.(result);
    };
    const shared = {
        ...props,
        label: props["aria-label"] ?? (props["aria-labelledby"] ? "" : "Value"),
        isLabelHidden: true,
        containerClassName: className,
        min,
        max,
        step,
        isDisabled: disabled,
        valueDisplay: "none" as const,
    };
    return values.length === 2 ? (
        <AstryxSlider
            {...shared}
            value={[values[0], values[1]]}
            onChange={change}
        />
    ) : (
        <AstryxSlider {...shared} value={values[0]} onChange={change} />
    );
}
