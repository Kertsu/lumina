import type { Ref } from "react";
import {
    Button,
    Header,
    Label,
    ListBox,
    ListBoxItem,
    ListBoxSection,
    Popover,
    Select,
    SelectValue,
} from "react-aria-components";
import { Icon } from "../Icon";
import { usePickerOverlay } from "./usePickerOverlay";
import "./pickers.css";

export interface PickerItem {
    value: string;
    label: string;
    disabled?: boolean;
}

interface PickerProps {
    active?: boolean;
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    items: PickerItem[];
    sections?: {
        label: string;
        items: PickerItem[];
    }[];
    disabled?: boolean;
    hideLabel?: boolean;
    className?: string;
    triggerRef?: Ref<HTMLButtonElement>;
}

function item(option: PickerItem) {
    return (
        <ListBoxItem
            key={option.value}
            id={option.value}
            textValue={option.label}
            isDisabled={option.disabled}
            className="lumina-picker-option"
        >
            <span>{option.label}</span>
            <span className="lumina-picker-check" aria-hidden="true">
                ✓
            </span>
        </ListBoxItem>
    );
}

export function Picker({
    label,
    value,
    onChange,
    items,
    sections = [],
    disabled,
    active = true,
    hideLabel,
    className = "",
    triggerRef,
}: PickerProps) {
    const overlay = usePickerOverlay(active && !disabled);
    return (
        <Select
            {...overlay}
            className={`lumina-picker ${className}`}
            value={String(value)}
            onChange={(key) => {
                if (key !== null) onChange(String(key));
            }}
            isDisabled={disabled}
        >
            <Label className={hideLabel ? "sr-only" : "lumina-picker-label"}>
                {label}
            </Label>
            <Button
                type="button"
                ref={triggerRef}
                className="lumina-picker-trigger"
            >
                <SelectValue className="lumina-picker-value" />
                <span className="lumina-picker-chevron" aria-hidden="true">
                    <Icon name="chevron" size={13} />
                </span>
            </Button>
            <Popover
                className="lumina-picker-popover"
                data-lumina-picker-overlay
                offset={5}
            >
                <ListBox className="lumina-picker-list">
                    {items.map(item)}
                    {sections.map((section) => (
                        <ListBoxSection
                            key={section.label}
                            id={section.label}
                            className="lumina-picker-section"
                        >
                            <Header className="lumina-picker-section-label">
                                {section.label}
                            </Header>
                            {section.items.map(item)}
                        </ListBoxSection>
                    ))}
                </ListBox>
            </Popover>
        </Select>
    );
}
