import { createContext, useContext } from "react";
import type { useDeskView } from "./use-desk-view";

export const DeskContext = createContext<ReturnType<typeof useDeskView> | null>(
    null
);

export function useDeskContext() {
    const context = useContext(DeskContext);
    if (!context) {
        throw new Error("Operator desk parts require OperatorDesk.Root.");
    }
    return context;
}
