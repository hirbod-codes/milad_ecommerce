import { ActionDispatch, ComponentProps, ReactNode, useContext, useEffect, useReducer, useRef, useState } from "react";
import { Order } from ".";
import { authFetchData, fetchData, formatCurrency, formatFilters, formatNumber, getApiUrl, getAuthApiUrl } from "@/src/Backend/helpers";
import { array } from "yup";
import { t } from "i18next";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { DataGrid } from "../DataGrid";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Stack } from "../Base/Stack";
import { Button } from "../Base/Button";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { EditIcon, EyeIcon, FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { CircularLoadingIcon } from "../Base/CircularLoadingIcon";
import { Ask } from "../Ask";
import { Modal } from "../Base/Modal";
import { ManageOrder } from "./ManageOrder";
import { Filters } from "../SearchFilter/index.d";
import { CheckBox } from "../Base/CheckBox";
import { Input } from "../Base/Input";
import { CircularLoading } from "../Base/CircularLoading";

export type DataGridProps = {
    orders?: Order[]
    afterDataFetchHook?: (orders: Order[]) => Order[]
    allFunctionalitiesToggle?: boolean
    functionality?: {
        search?: boolean
        select?: boolean
        filter?: boolean
        sort?: boolean
        create?: boolean
        update?: boolean
        delete?: boolean
        pagination?: boolean
    }
    options?: {
        appendDefaults?: boolean
        appendDefaultOverWriteColumns?: boolean
        defaultOverWriteColumns?: ColumnDef<any>[]
        appendDefaultAdditionalColumns?: boolean
        defaultAdditionalColumns?: ColumnDef<any>[]
        appendDefaultColumns?: boolean
        defaultColumns?: ColumnDef<any>[]
        appendDefaultHeaderNodes?: boolean
    }
    columns?: {
        columns: ColumnDef<any>[]
        additionalColumns: ColumnDef<any>[]
        overWriteColumns: ColumnDef<any>[]
    }
    headerNodes?: ReactNode[]
    onChange?: (orders: Order[]) => void
    dataGridProps?: Omit<ComponentProps<typeof DataGrid>, 'data'>
}

export function OrdersDataGrid({
    orders: inputOrders = [],
    afterDataFetchHook,
    allFunctionalitiesToggle = false,
    functionality,
    options = {
        appendDefaults: true,
        appendDefaultOverWriteColumns: true,
        appendDefaultAdditionalColumns: true,
        appendDefaultHeaderNodes: true,
    },
    columns = {
        columns: [],
        additionalColumns: [],
        overWriteColumns: [],
    },
    headerNodes,
    onChange,
    dataGridProps
}: DataGridProps) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [orders, setOrders] = useState<Order[]>(inputOrders)

    if (!functionality)
        functionality = {}

    for (const p of ['search', 'select', 'filter', 'sort', 'create', 'update', 'delete', 'pagination'])
        if ((allFunctionalitiesToggle === true && functionality[p] !== false) || (allFunctionalitiesToggle === false && functionality[p] === true))
            functionality[p] = true
        else
            functionality[p] = false

    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const [openFilter, setOpenFilter] = useState(false)
    const [filters, setFilters] = useState<Filters | undefined>(undefined)

    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const [openSort, setOpenSort] = useState(false)

    const [initialLoading, setInitialLoading] = useState(true)
    const [loading, setLoading] = useState(true)

    const init = async (offset: number = 0, limit: number = 0) => {
        setLoading(true)
        try {
            const res = await authFetchData(`${getApiUrl()}/orders?limit=${limit}&skip=${limit * offset}${filters === undefined ? '' : '&filter=' + JSON.stringify(formatFilters(filters))}`)
            if (!res.response || !res.response.ok || !array().required().isValidSync(res.data)) {
                feedback.push({ node: t('Orders.failedToFetchOrders'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                return false
            }

            if (res.data.length >= 0) {
                setOrders(res.data)
                return true
            }

            return false
        } finally { setLoading(false) }
    }

    const fetch = async (offset: number = 0, limit: number = 0) => {
        const res = await authFetchData(`${getApiUrl()}/orders?limit=${limit}&skip=${limit * offset}${filters === undefined ? '' : '&filter=' + JSON.stringify(formatFilters(filters))}`)
        if (!res.response || !res.response.ok || !array().required().isValidSync(res.data)) {
            feedback.push({ node: t('Orders.failedToFetchOrders'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
            return false
        }

        if (res.data.length >= 0) {
            setOrders(res.data)
            return true
        }

        return false
    }

    type State = {
        columns?: ColumnDef<any>[],
        additionalColumns?: ColumnDef<any>[],
        overWriteColumns?: ColumnDef<any>[],
        headerNodes: ReactNode[],
        searchedOrders: Order[],
        searching: boolean,
        creating: boolean,
        updatingRow: Row<any> | undefined,
        updatingIsAvailable: Row<any> | undefined,
        deletingRow: Row<any> | undefined,
        ask: ComponentProps<typeof Ask>,
        page: { limit: number, offset: number },
        fetching: boolean,
        showTags: Row<any> | undefined,
        showCategories: Row<any> | undefined,
        showProducts: Row<any> | undefined,
    }

    type Actions =
        { operation: 'fetch' | 'fetched' | 'createStarted' | 'createEnded' | 'updateEnded' | 'deleteEnded' | 'updatedIsAvailable' } |
        { operation: 'updateStarted' | 'updateIsAvailable' | 'deleteStarted' | 'showCategories' | 'showTags' | 'showProducts', data: Row<any> } |
        { operation: 'setPage', data: { offset: number, limit: number } }

    const reducer = (state, arg) => {
        switch (arg.operation) {
            case 'fetch':
                return { ...state, fetching: true, headerNodes: [...state.headerNodes] }

            case 'fetched':
                return { ...state, fetching: false }

            case 'createStarted':
                return {
                    ...state,
                    creating: true
                }

            case 'createEnded':
                init(state.page.offset, state.page.limit)
                return {
                    ...state,
                    creating: false
                }

            case 'updateStarted':
                return {
                    ...state,
                    updatingRow: arg.data
                }

            case 'updateEnded':
                init(state.page.offset, state.page.limit)
                return {
                    ...state,
                    updatingRow: undefined
                }

            case 'updateIsAvailable':
                return { ...state, updatingIsAvailable: arg.data, headerNodes: [...state.headerNodes] }

            case 'updatedIsAvailable':
                return { ...state, updatingIsAvailable: undefined, headerNodes: [...state.headerNodes] }

            case 'deleteStarted':
                return {
                    ...state,
                    deletingRow: arg.data,
                    ask: {
                        open: true,
                        title: t('Orders.deletionTitle'),
                        content: t('Orders.deletionContent'),
                        successAction: () =>
                            authFetchData(`${getAuthApiUrl()}/orders`, { method: 'delete', body: JSON.stringify({ id: arg.data.original._id }) })
                                .then(async r => {
                                    if (!r.response?.ok) {
                                        feedback.push({ node: t('Orders.DeletionFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                        return
                                    }

                                    dispatch({ operation: 'fetch' })

                                    dispatch({ operation: 'deleteEnded' })
                                }),
                        failureAction: () => dispatch({ operation: 'deleteEnded' })
                    }
                }

            case 'deleteEnded':
                return {
                    ...state,
                    deletingRow: undefined,
                    ask: { ...state.ask, open: false }
                }

            case 'setPage':
                return {
                    ...state,
                    page: arg.data
                }

            case 'showCategories':
                return {
                    ...state,
                    showCategories: arg.data
                }

            case 'showTags':
                return {
                    ...state,
                    showTags: arg.data
                }

            case 'showProducts':
                return {
                    ...state,
                    showProducts: arg.data
                }

            default:
                throw new Error(`Invalid operation requested in OrdersDataGrid component reducer!${typeof (arg as any).operation === 'string' ? ': ' + (arg as any).operation : ''}`)
        }
    }

    const [state, dispatch]: [State, ActionDispatch<[Actions]>] = useReducer<State, [Actions]>(reducer, {
        columns: [],
        additionalColumns: [],
        overWriteColumns: [],
        headerNodes: [],
        searchedOrders: [],
        searching: false,
        creating: false,
        updatingRow: undefined,
        updatingIsAvailable: undefined,
        deletingRow: undefined,
        ask: { open: false },
        fetching: false,
        page: { limit: 10, offset: 0 },
        showTags: undefined,
        showCategories: undefined,
        showProducts: undefined,
    })

    useEffect(() => {
        if (state.updatingIsAvailable !== undefined) {
            authFetchData(`${getApiUrl()}/orders`, { method: 'PATCH', body: JSON.stringify({ id: state.updatingIsAvailable.original._id, order: { isAvailable: !state.updatingIsAvailable.original.isAvailable } }) })
                .then(async r => {
                    if (!r.response || !r.response.ok) {
                        feedback.push({ node: t('UpdateOrder.updateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } });
                        return;
                    }

                    await init(state.page.offset, state.page.limit)

                    feedback.push({ node: t('UpdateOrder.updateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } });
                })
                .finally(() => dispatch({ operation: 'updatedIsAvailable' }))
        }
    }, [state.updatingIsAvailable])

    useEffect(() => {
        if (state.fetching === true)
            fetch(state.page.offset, state.page.limit)
                .finally(() => dispatch({ operation: 'fetched' }))
    }, [state.fetching])

    useEffect(() => {
        if (onChange)
            onChange(orders)
    }, [orders])

    useEffect(() => {
        if (orders.length === 0) {
            setInitialLoading(true)
            init(state.page.offset, state.page.limit)
                .finally(() => setInitialLoading(false))
        }
    }, [])

    const defaultOverWriteColumns = []
    const defaultAdditionalColumns = []

    const defaultColumns: ColumnDef<Order>[] = [
        {
            id: '_id',
            accessorKey: '_id',
        },
        {
            id: 'userId',
            accessorKey: 'userId',
        },
        {
            id: 'actions',
            accessorKey: 'actions',
            cell: ({ row }) =>
                <Stack stackProps={{ className: "justify-center w-full" }}>
                    {
                        functionality.update === true &&
                        <Button
                            isIcon
                            variant='text'
                            onClick={() => dispatch({ operation: 'updateStarted', data: row })}
                        >
                            {state.updatingRow === undefined || state.updatingRow.original._id !== row.original._id ? <EditIcon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                    {
                        functionality.delete === true &&
                        <Button
                            isIcon
                            variant='text'
                            fgColor='error'
                            onClick={() => dispatch({ operation: 'deleteStarted', data: row })}
                        >
                            {state.deletingRow === undefined || state.deletingRow.original._id !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                </Stack>
        },
        {
            id: 'cost',
            accessorKey: 'cost',
            cell: ({ getValue }) => formatCurrency(configuration, getValue()['IRR'] as number),
        },
        {
            id: 'address',
            accessorKey: 'address',
            cell: ({ getValue }) => getValue()['text'],
        },
        {
            id: 'map',
            accessorKey: 'address',
            cell: ({ getValue }) => getValue()['googleMap'],
        },
        {
            id: 'products',
            accessorKey: 'products',
            cell: ({ row }) => <div className="w-full flex flex-row justify-center"><Button isIcon variant="text" onClick={() => dispatch({ operation: 'showProducts', data: row })}><EyeIcon /></Button></div>,
        },
        {
            id: 'createdAt',
            accessorKey: 'createdAt',
            cell: ({ getValue }) => typeof getValue() === 'number' ? toFormat(getValue() as number, configuration.local, undefined, DATE) : '-',
        },
        {
            id: 'updatedAt',
            accessorKey: 'updatedAt',
            cell: ({ getValue }) => typeof getValue() === 'number' ? toFormat(getValue() as number, configuration.local, undefined, DATE) : '-',
        },
    ]

    const defaultHeaderNodes = [
        <Button variant='outline' onClick={() => dispatch({ operation: 'fetch' })}>{state.fetching === true ? <CircularLoadingIcon /> : <RefreshCwIcon />}{t('Orders.Refresh')}</Button>,
        functionality.filter === true && <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Orders.Filters')}</Button>,
        functionality.sort === true && <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Orders.Sorts')}</Button>,
        functionality.create === true && <Button fgColor='success' variant='outline' onClick={() => dispatch({ operation: 'createStarted' })}><PlusIcon />{t('Orders.Create')}</Button>,
    ]

    console.log('OrdersDataGrid', { loading, orders, state, afterDataFetchHook, allFunctionalitiesToggle, functionality, options, columns, headerNodes, onChange, dataGridProps })

    return (
        <>
            <DataGrid
                {...dataGridProps}
                data={orders}
                loading={initialLoading}
                columns={options?.appendDefaults === true || options?.appendDefaultColumns === true ? (columns?.columns ?? []).concat(defaultColumns) : columns?.columns}
                additionalColumns={options?.appendDefaults === true || options?.appendDefaultAdditionalColumns === true ? (columns?.additionalColumns ?? []).concat(defaultAdditionalColumns) : columns?.additionalColumns}
                overWriteColumns={options?.appendDefaults === true || options?.appendDefaultOverWriteColumns === true ? (columns?.overWriteColumns ?? []).concat(defaultOverWriteColumns) : columns?.overWriteColumns}
                pagination={functionality.pagination !== true ? undefined : { pageSize: state.page.limit, pageIndex: state.page.offset }}
                onPagination={functionality.pagination !== true ? undefined : async (p) => {
                    const result = await fetch(p.pageIndex, p.pageSize)
                    if (result)
                        dispatch({ operation: 'setPage', data: { limit: p.pageSize, offset: p.pageIndex } })
                    return result
                }}
                appendHeaderNodes={options?.appendDefaults === true || options?.appendDefaultHeaderNodes === true ? (headerNodes ?? []).concat(defaultHeaderNodes) : headerNodes}
            />

            <Ask {...state.ask} />

            <Modal
                open={state.creating || state?.updatingRow !== undefined}
                onClose={() => dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })}
            >
                <ManageOrder
                    order={state.creating ? undefined : state?.updatingRow?.original as any}
                    onFinish={async () => {

                        dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })
                        await init(state.page.offset, state.page.limit)
                    }}
                />
            </Modal>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={state?.showProducts !== undefined}
                onClose={() => dispatch({ operation: 'showProducts', data: undefined })}
            >
                <Stack direction="vertical" stackProps={{ className: 'w-full items-center justify-between' }}>
                    {state?.showProducts && Object.entries(orders.find(f => f._id === state?.showProducts?.original?._id) ?? {}).filter(f => ['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',].includes(f[0]) === false).map(m =>
                        <Stack key={m[0]}>
                            <Input containerProps={{ className: "flex-grow" }} readOnly value={m[0]} />
                            <Input containerProps={{ className: "flex-grow" }} placeholder={t('OrdersDataGrid.Value')} readOnly value={m[1] as any} />
                        </Stack>
                    )}
                </Stack>
            </Modal>
        </>
    )
}
