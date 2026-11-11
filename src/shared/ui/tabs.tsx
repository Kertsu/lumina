import { Tab, TabList } from "@astryxdesign/core/TabList";
import { type ComponentProps, useId } from "react";
import { TabsState, useTabsState } from "./tabs-state";

export function Tabs({
    value,
    onValueChange,
    children,
    ...props
}: Omit<ComponentProps<"div">, "defaultValue"> & {
    value: string;
    onValueChange: (value: string) => void;
}) {
    const id = useId();
    return (
        <TabsState.Provider
            value={{
                value,
                onValueChange,
                id,
            }}
        >
            <div {...props}>{children}</div>
        </TabsState.Provider>
    );
}

export function TabsList({ children, ...props }: ComponentProps<"div">) {
    const { value, onValueChange } = useTabsState();
    return (
        <TabList
            {...props}
            role="tablist"
            value={value}
            onChange={onValueChange}
        >
            {children}
        </TabList>
    );
}

export function TabsTrigger({
    value,
    ...props
}: Omit<ComponentProps<typeof Tab>, "panelId"> &
    Pick<ComponentProps<"button">, "title">) {
    const { id } = useTabsState();
    return (
        <Tab
            {...props}
            id={`${id}-tab-${value}`}
            value={value}
            panelId={`${id}-panel-${value}`}
        />
    );
}

export function TabsContent({
    value,
    children,
    tabIndex = 0,
    ...props
}: ComponentProps<"div"> & { value: string }) {
    const { value: selected, id } = useTabsState();
    if (value !== selected) {
        return null;
    }
    return (
        <div
            {...props}
            role="tabpanel"
            id={`${id}-panel-${value}`}
            aria-labelledby={`${id}-tab-${value}`}
            tabIndex={tabIndex}
        >
            {children}
        </div>
    );
}
