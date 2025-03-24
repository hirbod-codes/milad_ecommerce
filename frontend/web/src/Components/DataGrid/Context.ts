import { Table } from "@tanstack/react-table";
import { createContext } from "react";

export type Density = 'compact' | 'standard' | 'comfortable'

export type DataGridContext = {
    table: Table<any> | undefined;
    density: {
        value: Density
        set: (density: Density) => void
    };
}

export const DataGridContext = createContext<DataGridContext | undefined>(undefined)
