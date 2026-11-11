import { createContext, useContext } from "react";

export const TabsState = createContext<{
    value: string;
    onValueChange: (value: string) => void;
    id: string;
} | null>(null);

export function useTabsState() {
    const state = useContext(TabsState);
    if (!state) {
        throw new Error("Tabs parts require Tabs");
    }
    return state;
}
