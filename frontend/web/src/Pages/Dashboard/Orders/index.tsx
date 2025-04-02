import { ComponentProps, useContext, useEffect, useRef, useState } from "react";
import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { ColorStatic } from "@/src/Lib/Colors/ColorStatic";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { Ask } from "@/src/Components/Ask";
import { t } from "i18next";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array } from "yup";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { Filter, Filters } from "@/src/Components/SearchFilter/index.d";
import { DataGrid } from "@/src/Components/DataGrid";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoadingScreen } from "@/src/Components/Base/CircularLoadingScreen";
import { EditIcon, EyeIcon, FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Stack } from "@/src/Components/Base/Stack";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { Modal } from "@/src/Components/Base/Modal";
import { Product } from "../Products/index.d";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";

function formatFilters(filters: Filters) {
    let key = undefined
    let refObject: any = {}

    if (Object.keys(filters).includes('$and'))
        key = '$and'
    else
        key = '$or'

    refObject = { [key]: [] }

    console.log('filters', filters)

    for (const filter of filters[key])
        if (Object.keys(filter).includes('$and') || Object.keys(filter).includes('$or'))
            refObject[key].push(formatFilters(filter))
        else
            refObject[key].push(formatFilter(filter))

    console.log('refObject', refObject)
    return refObject
}

function formatFilter(filter: Filter) {
    return { [filter.field]: { [filter.operator]: filter.value } }
}

export function Orders() {
    const privileges = useContext(AuthContext).privileges
    const feedback = useContext(FeedbackContext)!

    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    const [orders, setOrders] = useState<any[]>([])

    const [openCreateOrderModal, setOpenCreateOrderModal] = useState(false)
    const [openUpdateOrderModal, setOpenUpdateOrderModal] = useState(false)
    const [editingOrder, setEditingOrder] = useState(undefined)
    const [deletingOrder, setDeletingOrder] = useState(undefined)

    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const [openFilter, setOpenFilter] = useState(false)
    const [filters, setFilters] = useState<Filters | undefined>(undefined)

    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const [openSort, setOpenSort] = useState(false)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [page, setPage] = useState<{ limit: number, offset: number }>({ limit: 10, offset: 0 })

    const [showProducts, setShowProducts] = useState<any | undefined>(undefined)
    const [fetchedProducts, setFetchedProducts] = useState<Product[]>(undefined)
    const [loadingProducts, setLoadingProducts] = useState(true)

    const [loading, setLoading] = useState(true)

    console.log('Orders', { orders, openFilter, filters, openSort, ask, page })

    const init = async (offset: number, limit: number): Promise<boolean> => {
        const res = await authFetchData(`${getApiUrl()}/orders?limit=${limit}&skip=${limit * offset}${filters === undefined ? '' : '&filter=' + JSON.stringify(formatFilters(filters))}`)
        if (!res.response || !res.response.ok || !array().required().isValidSync(res.data)) {
            feedback.push({
                node: t('Orders.failedToFetchOrders'),
                color: { bgColor: 'error', fgColor: 'error-foreground' }
            })
            return false
        }

        if (res.data.length >= 0) {
            setOrders(res.data)
            return true
        }

        return false
    }

    useEffect(() => {
        setLoading(true)
        init(page.offset, page.limit)
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (showProducts !== undefined) {
            setLoadingProducts(true);
            (async () => {
                const r = await fetchData(`${getApiUrl()}/products?ids=${orders?.find(o => o._id === showProducts)?.products?.map(m => m.productId)?.join(',')}`)
                if (!r.response || !r.response.ok || !array().required().isValidSync(r?.data)) {
                    feedback.push({ node: t('Orders.getProductsFailure') })
                    setFetchedProducts(undefined)
                } else
                    setFetchedProducts(r.data)
            })()
                .finally(() => setLoadingProducts(false))
        }
    }, [showProducts])

    const deleteOrder = async (id: string) => {
        const r = await authFetchData(`${getApiUrl()}/orders`, { method: 'delete', body: JSON.stringify({ orderId: id }) })
        if (r.response && r.response?.ok)
            feedback.push({ node: t('UpdateOrder.CreationSuccessful'), color: { bgColor: 'success', fgColor: 'success-foreground' } })
        else
            feedback.push({ node: t('UpdateOrder.CreationFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
    }

    let dataGridGradientColor = ColorStatic.parse(themeOptions.colors.primary[themeOptions.mode].main).toRgb()
    dataGridGradientColor.setAlpha(0.1)

    const createsOrder = privileges.find(f => f === 'create-category') !== undefined
    const updatesOrder = privileges.find(f => f === 'update-category') !== undefined
    const deletesOrder = privileges.find(f => f === 'delete-category') !== undefined

    const overWriteColumns: ColumnDef<any>[] = [
        {
            id: 'products',
            accessorKey: 'products',
            cell: ({ row }) => <div className="w-full flex flex-row justify-center"><Button isIcon variant="text" onClick={() => setShowProducts(row.original._id)}><EyeIcon /></Button></div>,
        },
        {
            id: 'isPayed',
            accessorKey: 'isAvailable',
            cell: ({ row, getValue }) => <div className="w-full flex flex-row justify-center">{Boolean(getValue()) ? <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='success' inputProps={{ checked: true, readOnly: true }} /> : <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='error' inputProps={{ checked: false, readOnly: true }} />}</div>,
        },
        {
            id: 'isSent',
            accessorKey: 'isAvailable',
            cell: ({ row, getValue }) => <div className="w-full flex flex-row justify-center">{Boolean(getValue()) ? <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='success' inputProps={{ checked: true, readOnly: true }} /> : <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='error' inputProps={{ checked: false, readOnly: true }} />}</div>,
        },
        {
            id: 'address',
            accessorKey: 'address',
            cell: ({ getValue }) => getValue()['text'],
        },
        {
            id: 'cost',
            accessorKey: 'cost',
            maxSize: 200,
            cell: ({ getValue }) => new Intl.NumberFormat(configuration.local.language, { useGrouping: true, currency: 'IRR', style: 'currency', signDisplay: 'never', maximumFractionDigits: 0 }).format(getValue()['IRR'] as number),
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

    const additionalColumns: ColumnDef<any>[] = [
        {
            id: 'actions',
            accessorKey: 'actions',
            cell: ({ row }) =>
                <Stack stackProps={{ className: "justify-center w-full" }}>
                    {
                        updatesOrder &&
                        <Button
                            isIcon
                            variant='text'
                            onClick={() => {
                                setEditingOrder(row.original._id)
                            }}
                        >
                            {editingOrder === undefined || editingOrder !== row.original._id ? <EditIcon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                    {
                        deletesOrder &&
                        <Button
                            isIcon
                            variant='text'
                            fgColor='error'
                            onClick={() => {
                                setDeletingOrder(row.original._id)
                                setAsk({
                                    open: true,
                                    title: t('Orders.deletionTitle'),
                                    content: t('Orders.deletionContent'),
                                    successAction: async () => { await deleteOrder(row.original._id); await init(page.offset, page.limit); setAsk({ ...ask, open: false }); },
                                    failureAction: () => { setDeletingOrder(undefined); setAsk({ ...ask, open: false }) }
                                });
                            }}
                        >
                            {deletingOrder === undefined || deletingOrder !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                </Stack>
        },
    ]

    return (
        <>
            {!loading
                ? <DataGrid
                    containerProps={{ stackProps: { style: { backgroundImage: `linear-gradient(to bottom right, ${dataGridGradientColor.toHex()} , transparent)` } } }}
                    configName='orders'
                    data={orders}
                    overWriteColumns={overWriteColumns}
                    additionalColumns={additionalColumns}
                    loading={loading}
                    hasPagination
                    defaultColumnVisibilityModel={{ userId: false, _id: false, schemaVersion: false }}
                    defaultColumnOrderModel={['actions', 'cost', 'isPayed', 'isSent', 'products', 'createdAt', 'updatedAt', 'address']}
                    pagination={{ pageSize: page.limit, pageIndex: page.offset }}
                    onPagination={async (p) => {
                        const result = await init(p.pageIndex, p.pageSize)
                        if (result)
                            setPage({ limit: p.pageSize, offset: p.pageIndex })
                        return result
                    }}
                    appendHeaderNodes={[
                        <Button variant='outline' onClick={async () => await init(page.offset, page.limit)}><RefreshCwIcon />{t('Orders.Refresh')}</Button>,
                        <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Orders.Filters')}</Button>,
                        <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Orders.Sorts')}</Button>,
                        createsOrder && <Button fgColor='success' variant='outline' onClick={() => setOpenCreateOrderModal(true)}><PlusIcon />{t('Orders.Create')}</Button>,
                    ]}
                />
                : <CircularLoadingScreen />
            }

            <Ask {...ask} onClose={() => { if (ask.failureAction) ask.failureAction(); else setAsk({ ...ask, open: false }) }} />

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={showProducts !== undefined}
                onClose={() => setShowProducts(undefined)}
            >
                <Stack direction="vertical">
                    {
                        loadingProducts
                            ? <CircularLoading />
                            : (
                                fetchedProducts === undefined
                                    ? t('common.NoData')
                                    : fetchedProducts.map((m, i) =>
                                        <div key={i}>{m.displayName[configuration.local.language]}</div>
                                    )
                            )
                    }
                </Stack>
            </Modal>
        </>
    )
}
