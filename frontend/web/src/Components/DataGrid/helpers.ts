import { ColumnDef } from '@tanstack/react-table';
import { Column } from "@tanstack/react-table";
import { CSSProperties, useContext } from "react";
import { ConfigurationContext } from '../../Contexts/Configuration/ConfigurationContext';

export const getColumns = (data: any[], overWriteColumns?: ColumnDef<any>[], additionalColumns?: ColumnDef<any>[], orderedColumnsFields?: string[]): ColumnDef<any>[] => {
    if (!data || data.length === 0)
        return [];

    let columns: ColumnDef<any>[] = Object.keys(data[0]).filter(f => f !== 'subRows').map(k => ({
        accessorKey: k,
        id: k
    }));

    if (overWriteColumns)
        for (let i = 0; i < overWriteColumns.length; i++) {
            const elm = overWriteColumns[i]

            const index = columns.findIndex(c => c.id === elm.id);
            if (index === -1)
                continue;

            let entries = Object.entries(columns[index])
                .map(
                    arr => {
                        if (Object.keys(elm).includes(arr[0]))
                            arr[1] = (elm as any)[arr[0]];
                        return arr;
                    }
                )

            entries = entries.concat(Object.entries(elm).filter(f => entries.find(e => e[0] === f[0]) === undefined));

            columns[index] = Object.fromEntries(entries) as ColumnDef<any>;
        }

    if (additionalColumns)
        columns = columns.concat(additionalColumns);

    if (orderedColumnsFields)
        for (let i = orderedColumnsFields.length - 1; i >= 0; i--) {
            let c = columns.find(c => c.id === orderedColumnsFields[i]);
            if (c === undefined)
                continue;

            columns = columns.filter(column => column.id !== c.id);
            columns.unshift(c);
        }

    return columns;
};

export function getCommonPinningStyles(column: Column<any>): CSSProperties {
    const c = useContext(ConfigurationContext)!
    const theme = c.themeOptions
    const direction = c.local.direction

    const isPinned = column.getIsPinned();
    const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left');
    const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right');

    if (!isPinned)
        return {}

    const left = isPinned === `left` ? `${column.getStart('left')}px` : undefined
    const right = isPinned === `right` ? `${column.getStart('right')}px` : undefined

    return {
        color: isPinned ? theme.colors.surface[theme.mode].foreground : undefined,
        backgroundColor: isPinned ? theme.colors.surface[theme.mode]['container-low'] : undefined,
        boxShadow: isLastLeftPinnedColumn ? '-4px 0 4px -4px gray inset' : isFirstRightPinnedColumn ? '4px 0 4px -4px gray inset' : undefined,
        left: direction === 'ltr' ? left : right,
        right: direction === 'ltr' ? right : left,
        opacity: isPinned ? 0.95 : undefined,
        position: isPinned ? 'sticky' : undefined,
        width: column.getSize(),
        zIndex: isPinned ? 1 : undefined,
    }
}

