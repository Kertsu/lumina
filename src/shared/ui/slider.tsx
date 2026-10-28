import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/shared/ui/utils";

export function Slider({
    className,
    defaultValue,
    value,
    min = 0,
    max = 100,
    ...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
    const values = value ?? defaultValue ?? [min];
    const singleThumbLabel =
        values.length === 1
            ? {
                  "aria-label": props["aria-label"],
                  "aria-labelledby": props["aria-labelledby"],
              }
            : {};
    return (
        <SliderPrimitive.Root
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            className={cn(
                "relative flex w-full touch-none select-none items-center data-[disabled]:opacity-40 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
                className
            )}
            {...props}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className="relative grow overflow-hidden rounded-full bg-input data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
            >
                <SliderPrimitive.Range
                    data-slot="slider-range"
                    className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
                />
            </SliderPrimitive.Track>
            {values.map((_, index) => (
                <SliderPrimitive.Thumb
                    // biome-ignore lint/suspicious/noArrayIndexKey: Radix identifies slider thumbs by their fixed position.
                    key={index}
                    data-slot="slider-thumb"
                    {...singleThumbLabel}
                    aria-describedby={props["aria-describedby"]}
                    className="block size-3.5 shrink-0 rounded-full border-2 border-primary bg-popover shadow-sm outline-none transition-shadow hover:ring-4 hover:ring-primary/15 focus-visible:ring-4 focus-visible:ring-primary/25 disabled:pointer-events-none"
                />
            ))}
        </SliderPrimitive.Root>
    );
}
