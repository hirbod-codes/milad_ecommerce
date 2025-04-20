import { ActionDispatch, ComponentProps, ReactNode, useContext, useEffect, useReducer, useRef, useState } from "react";
import { Product } from ".";
import { authFetchData, fetchData, formatCurrency, formatFilters, formatNumber, getApiUrl, getAuthApiUrl } from "@/src/Backend/helpers";
import { array } from "yup";
import { t } from "i18next";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { DataGrid } from "../DataGrid";
import { ColumnDef, Row, RowSelectionState } from "@tanstack/react-table";
import { Stack } from "../Base/Stack";
import { Button } from "../Base/Button";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { EditIcon, EyeIcon, FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { CircularLoadingIcon } from "../Base/CircularLoadingIcon";
import { Ask } from "../Ask";
import { Modal } from "../Base/Modal";
import { ManageProduct } from "./ManageProduct";
import { Filter, Filters } from "../SearchFilter/index.d";
import { CheckBox } from "../Base/CheckBox";
import { Input } from "../Base/Input";
import { CircularLoading } from "../Base/CircularLoading";
import { SearchFilter } from "../SearchFilter";
import { Sort } from "../Sort";
import { Sort as SortType } from "../Sort/index.d";

export type DataGridProps = {
    products?: Product[]
    afterDataFetchHook?: (products: Product[]) => Product[]
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
        columns?: ColumnDef<any>[]
        additionalColumns?: ColumnDef<any>[]
        overWriteColumns?: ColumnDef<any>[]
    }
    headerNodes?: ReactNode[]
    onChange?: (products: Product[]) => void
    onRowSelectionChange?: (rowSelectionState: RowSelectionState) => void
    dataGridProps?: Omit<ComponentProps<typeof DataGrid>, 'data'>
}

export function ProductsDataGrid({
    products: inputProducts = [],
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
    onRowSelectionChange,
    dataGridProps,
}: DataGridProps) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [products, setProducts] = useState<Product[]>(inputProducts)

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
    const [sorts, setSorts] = useState<SortType>([])

    const [commonFields, setCommonFields] = useState<{ [k: string]: string }>(undefined)

    const [initialLoading, setInitialLoading] = useState(true)
    const [loading, setLoading] = useState(true)

    const init = async (offset: number = 0, limit: number = 0) => {
        setLoading(true)
        try {
            fetchData(`${getApiUrl()}/products/common_fields`)
                .then(r => {
                    if (!r || !r.response || !r.data)
                        feedback.pushError({ node: t('ProductDataGrid.failedToFetchFields') })
                    else
                        setCommonFields(Object.fromEntries(Object.entries<string>(r.data).filter(f => f[0] !== 'name')))
                })
            return await fetch(offset, limit)
        } finally { setLoading(false) }
    }

    const fetch = async (offset: number = 0, limit: number = 10) => {
        console.log('fetch', { offset, limit, formattedFilters: state.formattedFilters, formattedSorts: state.formattedSorts })
        const res = await fetchData(`${getApiUrl()}/products?limit=${limit}&skip=${limit * offset}${state.formattedFilters === undefined ? '' : `&filter=${JSON.stringify(state.formattedFilters)}`}${state.formattedSorts === undefined || state.formattedSorts.length === 0 ? '' : `&sort=${JSON.stringify(state.formattedSorts)}`}`)
        console.log('res', res)
        if (!res.response || !res.response.ok || !array().required().isValidSync(res.data)) {
            feedback.pushError({ node: t('Products.failedToFetchProducts') })
            return false
        }

        if (res.data.length >= 0) {
            setProducts(res.data)
            return true
        }

        return false
    }

    const formatSorts = (sorts: SortType) => {
        let s = sorts
            .filter(f => f.field && ['asc', 'desc'].includes(f.direction))
            .map(m => {
                if (m.field === 'price')
                    m.field += '.IRR'
                if (m.field === 'displayName')
                    m.field += `.${configuration.local.language}`
                return m
            })
        return s.length !== 0 ? s : undefined
    }

    const formatFilters = (filters: Filters | Filter) => {
        if (!filters)
            return undefined

        const formattedFilters = {}
        if (Object.keys(filters).includes('$and') || Object.keys(filters).includes('$or')) {
            let k = Object.keys(filters).includes('$and') ? '$and' : '$or'
            let f = []
            for (const filter of filters[k]) {
                let t = formatFilters(filter)
                if (t)
                    f.push(t)
            }
            if (f.length !== 0)
                formattedFilters[k] = f
            else
                return undefined
        } else {
            let filter: Filter = Object.fromEntries(Object.entries(filters).filter(f => ['field', 'operator', 'value'].includes(f[0]))) as Filter
            if (!filter?.field || !filter?.operator || (filter?.operator !== '$undefined' && (filter?.value === undefined || filter?.value === null || (typeof filter?.value === 'string' && filter?.value?.trim() === ''))))
                return undefined

            if (filter.operator === '$undefined') {
                filter.operator = '$eq'
                filter.value = undefined
            }

            return filter
        }

        return formattedFilters
    }

    type State = {
        columns?: ColumnDef<any>[]
        additionalColumns?: ColumnDef<any>[]
        overWriteColumns?: ColumnDef<any>[]
        headerNodes: ReactNode[]
        searchedProducts: Product[]
        searching: boolean
        creating: boolean
        updatingRow: Row<any> | undefined
        updatingIsAvailable: Row<any> | undefined
        deletingRow: Row<any> | undefined
        ask: ComponentProps<typeof Ask>
        page: { limit: number, offset: number }
        fetching: boolean
        showTags: Row<any> | undefined
        showCategories: Row<any> | undefined
        showCustomFields: Row<any> | undefined
        searchByName: string
        formattedFilters: Filters | undefined
        formattedSorts: SortType | undefined
    }

    type Actions =
        { operation: 'searchedByName', data: Product[] } |
        { operation: 'searchByName', data: string } |
        { operation: 'apply' | 'fetch' | 'fetched' | 'createStarted' | 'createEnded' | 'updateEnded' | 'deleteEnded' | 'updatedIsAvailable' } |
        { operation: 'updateStarted' | 'updateIsAvailable' | 'deleteStarted' | 'showCategories' | 'showTags' | 'showCustomFields', data: Row<any> } |
        { operation: 'setPage', data: { offset: number, limit: number } }

    const reducer = (state: State, arg: Actions): State => {
        switch (arg.operation) {
            case 'apply':
                return { ...state, fetching: true, headerNodes: [...state.headerNodes], page: { limit: 10, offset: 0 }, formattedFilters: formatFilters(filters), formattedSorts: formatSorts(sorts) }

            case 'fetch':
                return { ...state, fetching: true, headerNodes: [...state.headerNodes] }

            case 'fetched':
                return { ...state, fetching: false, formattedFilters: undefined, formattedSorts: undefined }

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
                        title: t('Products.deletionTitle'),
                        content: t('Products.deletionContent'),
                        successAction: () =>
                            authFetchData(`${getAuthApiUrl()}/products`, { method: 'delete', body: JSON.stringify({ id: arg.data.original._id }) })
                                .then(async r => {
                                    if (!r.response?.ok) {
                                        feedback.push({ node: t('Products.DeletionFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
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

            case 'showCustomFields':
                return {
                    ...state,
                    showCustomFields: arg.data
                }

            case 'searchByName':
                return { ...state, searchByName: arg.data, searching: true }

            case 'searchedByName':
                return { ...state, searchedProducts: arg.data, searching: false }

            default:
                throw new Error(`Invalid operation requested in ProductsDataGrid component reducer!${typeof (arg as any).operation === 'string' ? ': ' + (arg as any).operation : ''}`)
        }
    }

    const [state, dispatch]: [State, ActionDispatch<[Actions]>] = useReducer<State, [Actions]>(
        reducer,
        {
            columns: [],
            additionalColumns: [],
            overWriteColumns: [],
            headerNodes: [],
            searchedProducts: [],
            searching: false,
            searchByName: '',
            creating: false,
            updatingRow: undefined,
            updatingIsAvailable: undefined,
            deletingRow: undefined,
            ask: { open: false },
            fetching: false,
            page: { limit: 10, offset: 0 },
            showTags: undefined,
            showCategories: undefined,
            showCustomFields: undefined,
            formattedFilters: undefined,
            formattedSorts: undefined,
        })

    const timer = useRef(undefined)

    useEffect(() => {
        console.log('state?.searchByName')
        if (timer.current !== undefined)
            clearTimeout(timer.current)
        if (state?.searchByName?.trim())
            timer.current = setTimeout(async () => {
                const r = await fetchData(`${getApiUrl()}/products/search?search=${state.searchByName}`)
                if (!r.response || !r.response.ok) {
                    feedback.pushError({ node: t('ProductsDataGrid.ProductSearchFailed') })
                    dispatch({ operation: 'searchedByName', data: [] })
                }
                else
                    dispatch({ operation: 'searchedByName', data: r.data })
            }, 1500)
        else
            dispatch({ operation: 'searchedByName', data: [] })
    }, [state?.searchByName])

    useEffect(() => {
        console.log('state.updatingIsAvailable')
        if (state.updatingIsAvailable !== undefined) {
            authFetchData(`${getApiUrl()}/products`, { method: 'PATCH', body: JSON.stringify({ id: state.updatingIsAvailable.original._id, product: { isAvailable: !state.updatingIsAvailable.original.isAvailable } }) })
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
        console.log('state.fetching')
        if (state.fetching === true)
            fetch(state.page.offset, state.page.limit)
                .finally(() => dispatch({ operation: 'fetched' }))
    }, [state.fetching])

    useEffect(() => {
        console.log('products')
        if (onChange)
            onChange(products)
    }, [products])

    useEffect(() => {
        console.log('[]')
        if (products.length === 0) {
            setInitialLoading(true)
            init(state.page.offset, state.page.limit)
                .finally(() => setInitialLoading(false))
        } else
            setInitialLoading(false)
    }, [])

    const defaultOverWriteColumns = []
    const defaultAdditionalColumns = []

    const defaultColumns: ColumnDef<Product>[] = [
        {
            id: '_id',
            accessorKey: '_id',
        },
        {
            id: 'name',
            accessorKey: 'name',
        },
        {
            id: 'displayName',
            accessorKey: 'displayName',
            cell: ({ getValue }) => getValue()[configuration.local.language],
        },
        {
            id: 'description',
            accessorKey: 'description',
            cell: ({ getValue }) => getValue()[configuration.local.language],
        },
        {
            id: 'isAvailable',
            accessorKey: 'isAvailable',
            cell: ({ row, cell, getValue }) =>
                <div className="w-full flex flex-row justify-center">
                    {functionality.update === true
                        ? (
                            state.updatingIsAvailable !== undefined && state.updatingIsAvailable.id === row.id
                                ? <CircularLoading />
                                : <CheckBox
                                    containerProps={{ className: 'w-fit' }}
                                    colorForeground='success'
                                    inputId={cell.id}
                                    inputProps={{
                                        checked: row.original.isAvailable,
                                        readOnly: functionality.update !== true ? undefined : true,
                                        onChange: functionality.update !== true ? undefined : () => dispatch({ operation: 'updateIsAvailable', data: row })
                                    }}
                                />
                        )
                        : <div className="w-full flex flex-row justify-center">{Boolean(getValue()) ? <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='success' inputProps={{ checked: true, readOnly: true }} /> : <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='error' inputProps={{ checked: false, readOnly: true }} />}</div>}
                </div>
        },
        {
            id: 'customFields',
            accessorKey: 'customFields',
            cell: ({ row }) => <div className="w-full flex flex-row justify-center"><Button isIcon variant="text" onClick={() => dispatch({ operation: 'showCustomFields', data: row })}><EyeIcon /></Button></div>,
        },
        {
            id: 'tags',
            accessorKey: 'tags',
            cell: ({ row, getValue }) =>
                <Stack stackProps={{ className: 'w-full justify-center' }}>
                    <div className="w-[5cm] text-center cursor-pointer rounded-lg hover:border text-nowrap text-ellipsis overflow-hidden" onClick={() => dispatch({ operation: 'showTags', data: row })}>
                        {(getValue() as string[]).join(', ')}
                    </div>
                </Stack>
        },
        {
            id: 'categories',
            accessorKey: 'categories',
            cell: ({ row, getValue }) =>
                <Stack stackProps={{ className: 'w-full justify-center' }}>
                    <div className="w-[5cm] text-center cursor-pointer rounded-lg hover:border text-nowrap text-ellipsis overflow-hidden" onClick={() => dispatch({ operation: 'showCategories', data: row })}>
                        {(getValue() as string[]).join(', ')}
                    </div>
                </Stack>
        },
        {
            id: 'views',
            accessorKey: 'views',
            cell: ({ getValue }) => formatNumber(configuration, getValue() as number),
        },
        {
            id: 'purchaseCount',
            accessorKey: 'purchaseCount',
            cell: ({ getValue }) => formatNumber(configuration, getValue() as number),
        },
        {
            id: 'reviewsCount',
            accessorKey: 'reviewsCount',
            cell: ({ getValue }) => formatNumber(configuration, getValue() as number),
        },
        {
            id: 'averageRating',
            accessorKey: 'averageRating',
            cell: ({ getValue }) => formatNumber(configuration, getValue() as number, { maximumFractionDigits: 2 }),
        },
        {
            id: 'price',
            accessorKey: 'price',
            maxSize: 200,
            cell: ({ getValue }) => formatCurrency(configuration, getValue()['IRR'] as number),
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

    if (functionality.update === true || functionality.delete === true)
        defaultColumns.push({
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
        })

    const defaultHeaderNodes = [
        <Button variant='outline' disabled={state.fetching} onClick={() => dispatch({ operation: 'fetch' })}>{state.fetching === true ? <CircularLoadingIcon /> : <RefreshCwIcon />}</Button>,
        functionality.filter === true && <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon /></Button>,
        functionality.sort === true && <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon /></Button>,
        functionality.create === true && <Button fgColor='success' variant='outline' onClick={() => dispatch({ operation: 'createStarted' })}><PlusIcon /></Button>,
        functionality.search === true && <Input startIcon={state?.searching ? <CircularLoading size="xs" /> : <SearchIcon />} placeholder={t('ProductsDataGrid.SearchByName')} value={state.searchByName ?? ''} onChange={(e) => dispatch({ operation: 'searchByName', data: e.target.value.trim() })} />,
    ]

    console.log('ProductsDataGrid', { commonFields, openFilter, filters, loading, products, state, afterDataFetchHook, allFunctionalitiesToggle, functionality, options, columns, headerNodes, onChange, dataGridProps })

    return (
        <>
            <DataGrid
                {...dataGridProps}
                data={state?.searchByName?.trim() ? state.searchedProducts : products}
                loading={initialLoading}
                columns={options?.appendDefaults === true || options?.appendDefaultColumns === true ? (columns?.columns ?? []).concat(defaultColumns) : columns?.columns}
                additionalColumns={options?.appendDefaults === true || options?.appendDefaultAdditionalColumns === true ? (columns?.additionalColumns ?? []).concat(defaultAdditionalColumns) : columns?.additionalColumns}
                overWriteColumns={options?.appendDefaults === true || options?.appendDefaultOverWriteColumns === true ? (columns?.overWriteColumns ?? []).concat(defaultOverWriteColumns) : columns?.overWriteColumns}
                pagination={functionality.pagination !== true ? undefined : { pageSize: state.page.limit, pageIndex: state.page.offset }}
                hasPagination={functionality.pagination === true}
                onPagination={functionality.pagination !== true ? undefined : async (p) => {
                    const result = await fetch(p.pageIndex, p.pageSize)
                    if (result)
                        dispatch({ operation: 'setPage', data: { limit: p.pageSize, offset: p.pageIndex } })
                    return result
                }}
                appendHeaderNodes={options?.appendDefaults === true || options?.appendDefaultHeaderNodes === true ? (headerNodes ?? []).concat(defaultHeaderNodes) : headerNodes}
                onRowSelectionChange={onRowSelectionChange}
            />

            <SearchFilter
                open={openFilter}
                onClose={() => setOpenFilter(false)}
                fields={Object.fromEntries([].concat(Object.entries(commonFields ?? [])).concat(configuration?.categories?.reduce((p, c) => p.concat(c?.recommendedProductProperties?.map(m => m.name)?.map(m => [m, 'string']) ?? []), []) ?? []))}
                displayFields={Object.fromEntries([].concat(Object.entries(commonFields ?? []))?.map(m => [m[0], t(`Columns.${m[0]}`)]).concat(configuration?.categories?.reduce((p, c) => p.concat(c?.recommendedProductProperties?.map(m => [m.name, m.display[configuration.local.language]]) ?? []), []) ?? []))}
                filters={filters}
                setFilters={setFilters}
                apply={() => {
                    dispatch({ operation: 'apply' })
                    setOpenFilter(false)
                }}
            />

            <Sort
                open={openSort}
                onClose={() => setOpenSort(false)}
                fields={Object.fromEntries([].concat(Object.entries(commonFields ?? [])).concat(configuration?.categories?.reduce((p, c) => p.concat(c?.recommendedProductProperties?.map(m => m.name)?.map(m => [m, 'string']) ?? []), []) ?? []))}
                displayFields={Object.fromEntries([].concat(Object.entries(commonFields ?? []))?.map(m => [m[0], t(`Columns.${m[0]}`)]).concat(configuration?.categories?.reduce((p, c) => p.concat(c?.recommendedProductProperties?.map(m => [m.name, m.display[configuration.local.language]]) ?? []), []) ?? []))}
                sorts={sorts}
                setSorts={setSorts}
                apply={() => {
                    dispatch({ operation: 'apply' })
                    setOpenSort(false)
                }}
            />

            <Ask {...state.ask} />

            <Modal
                open={state.creating || state?.updatingRow !== undefined}
                onClose={() => dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })}
            >
                <ManageProduct
                    product={state.creating ? undefined : state?.updatingRow?.original as any}
                    onFinish={async () => {

                        dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })
                        await init(state.page.offset, state.page.limit)
                    }}
                />
            </Modal>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={state?.showCustomFields !== undefined}
                onClose={() => dispatch({ operation: 'showCustomFields', data: undefined })}
            >
                <Stack direction="vertical" stackProps={{ className: 'w-full items-center justify-between' }}>
                    {state?.showCustomFields && Object.entries(products.find(f => f._id === state?.showCustomFields?.original?._id) ?? {}).filter(f => ['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',].includes(f[0]) === false).map(m =>
                        <Stack key={m[0]}>
                            <Input containerProps={{ className: "flex-grow" }} readOnly value={m[0]} />
                            <Input containerProps={{ className: "flex-grow" }} placeholder={t('ProductsDataGrid.Value')} readOnly value={m[1] as any} />
                        </Stack>
                    )}
                </Stack>
            </Modal>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={state?.showTags !== undefined}
                onClose={() => dispatch({ operation: 'showTags', data: undefined })}
            >
                <Stack direction="vertical">
                    {products?.find(f => f._id === state?.showTags?.original?._id)?.tags?.map(m =>
                        <div key={m} className="text-lg">
                            {m}
                        </div>
                    )}
                </Stack>
            </Modal>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={state?.showCategories !== undefined}
                onClose={() => dispatch({ operation: 'showCategories', data: undefined })}
            >
                <Stack direction="vertical">
                    {products?.find(f => f._id === state?.showCategories?.original?._id)?.categories?.map(m =>
                        <div key={m} className="text-lg">
                            {m}
                        </div>
                    )}
                </Stack>
            </Modal>
        </>
    )
}
