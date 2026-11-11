import {
    CommandPaletteGroup,
    CommandPaletteInput,
    CommandPaletteItem,
    CommandPaletteList,
} from "@astryxdesign/core/CommandPalette";
import { useCombobox } from "@astryxdesign/core/Selector";
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";

type CommandEntry = {
    value: string;
    label: string;
    keywords: string[];
    disabled?: boolean;
    icon: ReactNode;
    shortcut: ReactNode;
    onSelect: () => void;
};

/** Compose Astryx's palette parts so unavailable commands remain visible and disabled. */
export function CommandMenu({
    groups,
    onClose,
}: {
    groups: { heading: string; items: CommandEntry[] }[];
    onClose: () => void;
}) {
    const [query, setQuery] = useState("");
    const listboxId = useId();
    const filtered = useMemo(() => {
        const terms = query.toLocaleLowerCase().trim().split(/\s+/);
        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    terms.every((term) =>
                        `${item.label} ${item.keywords.join(" ")}`
                            .toLocaleLowerCase()
                            .includes(term)
                    )
                ),
            }))
            .filter((group) => group.items.length);
    }, [groups, query]);
    const items = useMemo(
        () => filtered.flatMap((group) => group.items),
        [filtered]
    );
    const combo = useCombobox({
        selectableItems: items,
        isOpen: true,
        hasSearch: true,
        listboxId,
        onOpen: () => {},
        onClose,
        onSelect: (value) =>
            items.find((item) => item.value === value)?.onSelect(),
    });
    const { setHighlightedIndex } = combo;
    useEffect(() => {
        setHighlightedIndex(items.findIndex((item) => !item.disabled));
    }, [items, setHighlightedIndex]);
    return (
        <>
            <CommandPaletteInput
                {...combo.getFieldProps()}
                value={query}
                onValueChange={setQuery}
                label="Search keyboard shortcuts"
                placeholder="Search keyboard shortcuts…"
                data-autofocus
            />
            <CommandPaletteList
                {...combo.getListboxProps()}
                label="Keyboard shortcuts"
                className="command-results"
            >
                {filtered.map((group) => (
                    <CommandPaletteGroup
                        key={group.heading}
                        heading={group.heading}
                    >
                        {group.items.map((item) => {
                            const index = items.indexOf(item);
                            return (
                                <CommandPaletteItem
                                    key={item.value}
                                    className="command-option"
                                    id={combo.getItemId(index)}
                                    value={item.value}
                                    isDisabled={item.disabled}
                                    isHighlighted={
                                        index === combo.highlightedIndex
                                    }
                                    isSelected={
                                        index === combo.highlightedIndex
                                    }
                                    onSelect={() => combo.onItemSelect(item)}
                                    onMouseMove={() =>
                                        combo.onItemMouseEnter(item, index)
                                    }
                                >
                                    {item.icon}
                                    <span className="min-w-0 flex-1">
                                        {item.label}
                                    </span>
                                    <kbd>{item.shortcut}</kbd>
                                </CommandPaletteItem>
                            );
                        })}
                    </CommandPaletteGroup>
                ))}
                {!items.length && (
                    <p className="command-empty">No shortcuts found.</p>
                )}
            </CommandPaletteList>
        </>
    );
}
