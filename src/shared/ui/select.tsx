import { Selector, type SelectorProps } from "@astryxdesign/core/Selector";

export function SelectValue({
    label,
    text = label,
}: {
    label: string;
    text?: string;
}) {
    return (
        <span className="select-value" title={label}>
            {text}
        </span>
    );
}

export function Select(props: SelectorProps) {
    return (
        <Selector
            isLabelHidden={!props.id}
            width="100%"
            presentation="popover"
            renderValue={(option) => (
                <SelectValue label={option.label ?? option.value} />
            )}
            {...props}
        />
    );
}
