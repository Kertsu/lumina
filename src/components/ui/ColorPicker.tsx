import { useEffect, useState } from "react";
import {
    ColorPicker as AriaColorPicker,
    Button,
    ColorArea,
    ColorField,
    ColorSlider,
    ColorSwatch,
    ColorThumb,
    Dialog,
    DialogTrigger,
    Input,
    Label,
    Popover,
    parseColor,
    SliderTrack,
} from "react-aria-components";
import { usePickerOverlay } from "./usePickerOverlay";
import "./pickers.css";

interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    active?: boolean;
}

export function ColorPicker({
    label,
    value,
    onChange,
    disabled,
    active = true,
}: ColorPickerProps) {
    const overlay = usePickerOverlay(active && !disabled);
    const [color, setColor] = useState(() => parseColor(value));
    useEffect(() => {
        setColor((current) =>
            current.toString("hex").toLowerCase() === value.toLowerCase()
                ? current
                : parseColor(value)
        );
    }, [value]);
    return (
        <div className="lumina-color-picker">
            <span>{label}</span>
            <AriaColorPicker
                value={color}
                onChange={(next) => {
                    setColor(next);
                    onChange(next.toString("hex"));
                }}
            >
                <DialogTrigger {...overlay}>
                    <Button
                        type="button"
                        className="lumina-color-trigger"
                        aria-label={`${label}: ${value}`}
                        isDisabled={disabled}
                    >
                        <ColorSwatch className="lumina-color-swatch" />
                        <span>{value.toUpperCase()}</span>
                    </Button>
                    <Popover
                        className="lumina-color-popover"
                        data-lumina-picker-overlay
                        offset={5}
                    >
                        <Dialog
                            aria-label={label}
                            className="lumina-color-dialog"
                        >
                            <h3>{label}</h3>
                            <ColorArea
                                className="lumina-color-area"
                                colorSpace="hsb"
                                xChannel="saturation"
                                yChannel="brightness"
                                aria-label={`${label} saturation and brightness`}
                            >
                                <ColorThumb className="lumina-color-thumb" />
                            </ColorArea>
                            <ColorSlider
                                className="lumina-color-slider"
                                colorSpace="hsb"
                                channel="hue"
                            >
                                <Label>Hue</Label>
                                <SliderTrack className="lumina-color-track">
                                    <ColorThumb className="lumina-color-thumb" />
                                </SliderTrack>
                            </ColorSlider>
                            <ColorField className="lumina-color-field">
                                <Label>Hex color</Label>
                                <Input spellCheck={false} />
                            </ColorField>
                            <Button
                                type="button"
                                slot="close"
                                className="button compact"
                            >
                                Done
                            </Button>
                        </Dialog>
                    </Popover>
                </DialogTrigger>
            </AriaColorPicker>
        </div>
    );
}
