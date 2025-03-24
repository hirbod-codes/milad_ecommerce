import { ComponentProps, Fragment, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import {
    ColumnDef,
    ColumnPinningState,
    PaginationState,
    VisibilityState,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'

// needed for table body level scope DnD setup
import {
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable'
// needed for row & cell level scope DnD setup
import { t } from 'i18next'
import { DraggableTableHeader } from './DraggableTableHeader'
import { DragAlongCell } from './DragAlongCell'
import { ColumnVisibilityButton } from './ColumnVisibilityButton'
import { DataGridContext, Density } from './Context'
import { DensityButton } from './DensityButton'
import { ExportButton } from './ExportButton'
import { Pagination } from './Pagination'
import { getColumns } from './helpers'
import { getLuxonLocale } from '../../Lib/localization'
import { ConfigurationContext } from '../../Contexts/Configuration/ConfigurationContext'
import { CircularLoadingIcon } from '../Base/CircularLoadingIcon'
import { Stack } from '../Base/Stack'
import { cn } from '../../shadcn/lib/utils'
import { StorageApi } from '@/src/Backend/Storage/StorageApi'

export type DataGridProps = {
    configName?: string
    data: any[]
    overWriteColumns?: ColumnDef<any>[]
    additionalColumns?: ColumnDef<any>[]
    prependHeaderNodes?: ReactNode[]
    prependFooterNodes?: ReactNode[]
    showColumnHeaders?: boolean
    addCounterColumn?: boolean
    headerNodes?: ReactNode[]
    defaultHeaderNodes?: boolean
    footerNodes?: ReactNode[]
    defaultFooterNodes?: boolean
    appendHeaderNodes?: ReactNode[]
    appendFooterNodes?: ReactNode[]
    hasPagination?: boolean
    paginationLimitOptions?: number[]
    pagination?: PaginationState
    onPagination?: (pagination: PaginationState) => Promise<boolean> | boolean
    loading?: boolean
    defaultColumnPinningModel?: ColumnPinningState
    defaultColumnVisibilityModel?: VisibilityState
    defaultColumnOrderModel?: string[]
    defaultTableDensity?: Density
    dataGridContainerProps?: ComponentProps<typeof Stack>
    tHeadProps?: ComponentProps<'thead'>
    tBodyProps?: ComponentProps<'tbody'>
    tableProps?: ComponentProps<'table'>
    headerNodesContainerProps?: ComponentProps<typeof Stack>
    footerNodesContainerProps?: ComponentProps<typeof Stack>
    containerProps?: ComponentProps<typeof Stack>
    tableContainerProps?: ComponentProps<'div'>
}

export function DataGrid({
    configName,
    data,
    overWriteColumns = [],
    additionalColumns = [],
    prependHeaderNodes = [],
    prependFooterNodes = [],
    showColumnHeaders = true,
    addCounterColumn = true,
    headerNodes = [],
    defaultHeaderNodes = true,
    footerNodes = [],
    defaultFooterNodes = true,
    appendHeaderNodes = [],
    appendFooterNodes = [],
    hasPagination = false,
    paginationLimitOptions = [10, 25, 50, 100],
    pagination,
    onPagination,
    loading = false,
    defaultColumnPinningModel = { left: ['counter'], right: [] },
    defaultColumnVisibilityModel = {},
    defaultColumnOrderModel = ['counter'],
    defaultTableDensity = 'compact',
    dataGridContainerProps,
    tHeadProps,
    tBodyProps,
    tableProps,
    headerNodesContainerProps,
    footerNodesContainerProps,
    containerProps,
    tableContainerProps,
}: DataGridProps) {
    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    if (!pagination)
        pagination = { pageIndex: 0, pageSize: 10 }

    if (addCounterColumn === true)
        data = data.map((d, i) => ({ ...d, counter: (pagination.pageIndex * pagination.pageSize) + (i + 1) }))

    const columns = useMemo<ColumnDef<any>[]>(() => {
        return getColumns(data, overWriteColumns, additionalColumns, defaultColumnOrderModel)
    }, [overWriteColumns, additionalColumns, defaultColumnOrderModel])

    if (addCounterColumn === true && !columns.find(f => f.id === 'counter'))
        columns.unshift({
            id: 'counter',
            accessorKey: 'counter',
            cell: ({ getValue }) => new Intl.NumberFormat(getLuxonLocale(configuration.local.language), { minimumIntegerDigits: 1, useGrouping: false }).format(getValue() as number)
        })

    const [density, setDensity] = useState<Density>('compact')
    const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrderModel ?? (columns ?? []).map(c => c.id).filter(f => f !== undefined))
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibilityModel)
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(defaultColumnPinningModel)

    const [hasInit, setHasInit] = useState(false)

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { delay: 40, tolerance: 150 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 40, tolerance: 150 } }),
        useSensor(KeyboardSensor, {})
    )

    const [table, setTable] = useState(useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        enableHiding: true,
        state: {
            columnOrder,
            columnVisibility,
            columnPinning,
            pagination: hasPagination && !onPagination ? pagination : undefined
        },
        enableColumnPinning: true,
        onColumnPinningChange: async (updaterOrValue) => {
            if (!hasInit)
                return

            let cp: ColumnPinningState
            if (typeof updaterOrValue !== 'function')
                cp = updaterOrValue
            else
                cp = updaterOrValue(columnPinning)

            if (configName) {
                const c = (await (await StorageApi.getInstance()).getConfig())!

                if (!c.columnPinningModels)
                    c.columnPinningModels = {}

                c.columnPinningModels[configName] = cp;
                (await StorageApi.getInstance()).setConfig(c)
            }

            setColumnPinning(cp);
        },
        onColumnOrderChange: async (updaterOrValue) => {
            if (!hasInit)
                return

            let co
            if (typeof updaterOrValue !== 'function')
                co = updaterOrValue
            else
                co = updaterOrValue(columnOrder)

            if (configName) {
                const c = (await (await StorageApi.getInstance()).getConfig())!

                if (!c.columnOrderModels)
                    c.columnOrderModels = {}

                c.columnOrderModels[configName] = co;
                (await StorageApi.getInstance()).setConfig(c)
            }

            setColumnOrder(co);
        },
        onColumnVisibilityChange: async (updaterOrValue) => {
            if (!hasInit)
                return

            let cv
            if (typeof updaterOrValue !== 'function')
                cv = updaterOrValue
            else
                cv = updaterOrValue(columnVisibility)

            if (configName) {
                const c = (await (await StorageApi.getInstance()).getConfig())!

                if (!c.columnVisibilityModels)
                    c.columnVisibilityModels = {}

                c.columnVisibilityModels[configName] = cv;
                (await StorageApi.getInstance()).setConfig(c)
            }

            setColumnVisibility(cv)
        },
        onPaginationChange: hasPagination && !onPagination ? onPagination as any : undefined,
        getPaginationRowModel: hasPagination && !onPagination ? getPaginationRowModel() : undefined,
    }))

    if (defaultHeaderNodes !== false)
        headerNodes = [
            <ColumnVisibilityButton />,
            <DensityButton />,
            <ExportButton />,
        ]

    if (prependHeaderNodes && prependHeaderNodes.length !== 0)
        headerNodes = prependHeaderNodes.concat(headerNodes)
    if (appendHeaderNodes && appendHeaderNodes.length !== 0)
        headerNodes = headerNodes.concat(appendHeaderNodes)

    if (hasPagination === true && defaultFooterNodes !== false)
        footerNodes = [
            <Pagination
                paginationLimitOptions={paginationLimitOptions}
                onPagination={async (l, o) => {
                    console.log({ l, o })
                    if (onPagination)
                        return await onPagination({ pageIndex: o, pageSize: l })
                    return true
                }}
                setPaginationLimitChange={async (size) => {
                    if (onPagination)
                        await onPagination({ pageIndex: 0, pageSize: size })
                }}
            />
        ]

    if (prependFooterNodes && prependFooterNodes.length !== 0)
        footerNodes = prependFooterNodes.concat(footerNodes)
    if (appendFooterNodes && appendFooterNodes.length !== 0)
        footerNodes = footerNodes.concat(appendFooterNodes)

    const init = async () => {
        if (!configName)
            return

        const c = await (await StorageApi.getInstance()).getConfig()

        if (c?.columnVisibilityModels && c.columnVisibilityModels[configName]) {
            setColumnVisibility(c.columnVisibilityModels[configName])
            table.setColumnVisibility(c.columnVisibilityModels[configName])
        }
        else {
            setColumnVisibility(defaultColumnVisibilityModel)
            table.setColumnVisibility(defaultColumnVisibilityModel)
            if (!c!.columnVisibilityModels)
                c!.columnVisibilityModels = {}
            c!.columnVisibilityModels[configName] = defaultColumnVisibilityModel
        }

        if (c?.columnOrderModels && c.columnOrderModels[configName]) {
            setColumnOrder(c!.columnOrderModels[configName])
            table.setColumnOrder(c!.columnOrderModels[configName])
        } else {
            setColumnOrder(defaultColumnOrderModel)
            table.setColumnOrder(defaultColumnOrderModel)
            if (!c!.columnOrderModels)
                c!.columnOrderModels = {}
            c!.columnOrderModels[configName] = defaultColumnOrderModel
        }

        if (c?.columnPinningModels && c.columnPinningModels[configName]) {
            setColumnPinning(c!.columnPinningModels[configName])
            table.setColumnPinning(c!.columnPinningModels[configName])
        } else {
            setColumnPinning(defaultColumnPinningModel)
            table.setColumnPinning(defaultColumnPinningModel)
            if (!c!.columnPinningModels)
                c!.columnPinningModels = {}
            c!.columnPinningModels[configName] = defaultColumnPinningModel
        }

        if (c?.tableDensity && c.tableDensity[configName])
            setDensity(c?.tableDensity[configName])
        else {
            setDensity(defaultTableDensity)
            if (!c!.tableDensity)
                c!.tableDensity = {}
            c!.tableDensity[configName] = defaultTableDensity
        }

        (await StorageApi.getInstance()).setConfig(c!);
        setHasInit(true)
    }

    useEffect(() => {
        init()
    }, [])

    console.log('DataGrid', { data, columns, pagination, columnPinning, columnVisibility, columnOrder, headerNodes, footerNodes })

    return (
        <>
            <DataGridContext.Provider
                value={{
                    table, density: {
                        value: density,
                        set: async (d) => {
                            const c = (await (await StorageApi.getInstance()).getConfig())!
                            if (!c?.tableDensity)
                                c.tableDensity = {}

                            if (configName) {
                                c.tableDensity[configName] = d
                                await (await StorageApi.getInstance()).setConfig(c)
                            }

                            setDensity(d)
                        }
                    }
                }}
            >
                <Stack {...containerProps} direction='vertical' stackProps={{ ...containerProps?.stackProps, id: containerProps?.stackProps?.id ?? 'dataGridContainer', className: cn('p-2 border rounded-md h-full overflow-hidden text-nowrap', containerProps?.stackProps?.className) }}>
                    {/* NOTE: This provider creates div elements, so don't nest inside of <table> elements */}
                    <DndContext
                        collisionDetection={closestCenter}
                        modifiers={[restrictToHorizontalAxis]}
                        onDragEnd={(e: DragEndEvent) => {
                            const { active, over } = e

                            if (!active || !over || active.id === over.id)
                                return

                            const oldIndex = columnOrder.indexOf(active.id as string)
                            const newIndex = columnOrder.indexOf(over.id as string)
                            const newColumnOrder = arrayMove(columnOrder, oldIndex, newIndex)
                            setColumnOrder(newColumnOrder)
                            table.setColumnOrder(newColumnOrder)
                        }}
                        sensors={sensors}
                    >
                        {headerNodes.length > 0 &&
                            <Stack  {...headerNodesContainerProps} stackProps={{ ...headerNodesContainerProps?.stackProps, id: headerNodesContainerProps?.stackProps?.id ?? 'headerNodesContainer', className: cn('bg-surface-container p-2 rounded-md', headerNodesContainerProps?.stackProps?.className) }}>
                                {...headerNodes.map((n, i) =>
                                    <Fragment key={i}>
                                        {n}
                                    </Fragment>
                                )}
                            </Stack>
                        }
                        {loading
                            ? <CircularLoadingIcon />
                            : (
                                data.length === 0
                                    ? <p style={{ textAlign: 'center' }}>{t('DataGrid.noData')}</p>
                                    :
                                    <div id='tableContainer' {...tableContainerProps} className={cn('overflow-auto flex-grow border rounded-md', tableContainerProps?.className)}>
                                        <table {...tableProps} className={cn('min-w-full border-separate', tableProps?.className)}>
                                            {showColumnHeaders &&
                                                <thead {...tHeadProps} className={cn('sticky select-none z-[1] top-0', tableProps?.className)}>
                                                    {table.getHeaderGroups().map(headerGroup => (
                                                        <tr key={headerGroup.id} className='bg-surface'>
                                                            <SortableContext
                                                                items={columnOrder}
                                                                strategy={horizontalListSortingStrategy}
                                                            >
                                                                {headerGroup.headers.map(header => (<DraggableTableHeader key={header.id} header={header} />))}
                                                            </SortableContext>
                                                        </tr>
                                                    ))}
                                                </thead>
                                            }
                                            <tbody {...tBodyProps} className={cn('even:[&_tr]:bg-surface-container', tBodyProps?.className)}>
                                                {table.getRowModel().rows.map((row, i, arr) => (
                                                    <tr key={row.id} className={`text-nowrap ${i === (arr.length - 1) ? '' : 'border-b'}`}>
                                                        {row.getVisibleCells().map(cell => (
                                                            <SortableContext
                                                                key={cell.id}
                                                                items={columnOrder}
                                                                strategy={horizontalListSortingStrategy}
                                                            >
                                                                <DragAlongCell key={cell.id} cell={cell} />
                                                            </SortableContext>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                            )
                        }
                        {footerNodes.length > 0 &&
                            <Stack {...footerNodesContainerProps} stackProps={{ ...footerNodesContainerProps?.stackProps, id: footerNodesContainerProps?.stackProps?.id ?? 'footerNodesContainer', className: cn('bg-surface-container p-2 rounded-md justify-end', footerNodesContainerProps?.stackProps?.className) }}>
                                {...footerNodes.map((n, i) =>
                                    <Fragment key={i}>
                                        {n}
                                    </Fragment>
                                )}
                            </Stack>
                        }
                    </DndContext>
                </Stack >
            </DataGridContext.Provider >
        </>
    )
}
