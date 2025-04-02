import { ComponentProps, useContext, useEffect, useRef, useState } from "react";
import { authFetchData, fetchData, formatCurrency, formatFilters, getApiUrl } from "@/src/Backend/helpers";
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
import { EditIcon, EyeIcon, FilterIcon, ListFilterIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Stack } from "@/src/Components/Base/Stack";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { Modal } from "@/src/Components/Base/Modal";
import { Product } from "../Products/index.d";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { UpdateOrder } from "./UpdateOrder";
import { Order } from './index.d'

export function Orders() {
    const privileges = useContext(AuthContext).privileges
    const feedback = useContext(FeedbackContext)!

    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    const [orders, setOrders] = useState<Order[]>([])

    const [openCreateOrderModal, setOpenCreateOrderModal] = useState(false)

    const [openUpdateOrderModal, setOpenUpdateOrderModal] = useState(false)
    const [updatingOrder, setUpdatingOrder] = useState(undefined)
    const [updatingIsPayed, setUpdatingIsPayed] = useState<string | undefined>(undefined)
    const [updatingIsSent, setUpdatingIsSent] = useState<string | undefined>(undefined)

    const [deletingOrder, setDeletingOrder] = useState(undefined)

    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const [openFilter, setOpenFilter] = useState(false)
    const [filters, setFilters] = useState<Filters | undefined>(undefined)

    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const [openSort, setOpenSort] = useState(false)

    const [openSearchByUser, setOpenSearchByUser] = useState(false)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [page, setPage] = useState<{ limit: number, offset: number }>({ limit: 10, offset: 0 })

    const [showProducts, setShowProducts] = useState<any | undefined>(undefined)
    const [fetchedProducts, setFetchedProducts] = useState<Product[]>(undefined)
    const [loadingProducts, setLoadingProducts] = useState(true)

    const [refreshing, setRefreshing] = useState(false)
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
    const updatesImmutableOrder = privileges.find(f => f === 'update-immutables-category') !== undefined
    const deletesOrder = privileges.find(f => f === 'delete-category') !== undefined

    const overWriteColumns: ColumnDef<any>[] = [
        {
            id: 'products',
            accessorKey: 'products',
            cell: ({ row }) => <div className="w-full flex flex-row justify-center"><Button isIcon variant="text" onClick={() => setShowProducts(row.original._id)}><EyeIcon /></Button></div>,
        },
        {
            id: 'isSent',
            accessorKey: 'isSent',
            cell: ({ row, getValue }) =>
                <div className="w-full flex flex-row justify-center">
                    {updatingIsSent !== undefined && updatingIsSent === row.original._id
                        ? <CircularLoading />
                        : <CheckBox
                            containerProps={{ className: 'w-fit' }}
                            colorForeground='success'
                            inputProps={{
                                checked: row.original.isSent,
                                readOnly: updatesImmutableOrder === false,
                                onChange: updatesImmutableOrder === false ? undefined : async (e) => {
                                    e.stopPropagation();

                                    setUpdatingIsSent(row.original._id);
                                    try {
                                        const data = { orderId: row.original._id, order: { isSent: !(Boolean(getValue())) } };
                                        const r = await authFetchData(`${getApiUrl()}/orders/immutables`, { method: 'PATCH', body: JSON.stringify(data) });
                                        if (!r.response || !r.response.ok) {
                                            feedback.push({ node: t('UpdateOrder.updateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } });
                                            return;
                                        }

                                        feedback.push({ node: t('UpdateOrder.updateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } });

                                        await init(page.offset, page.limit);
                                    } finally { setUpdatingIsSent(undefined); }
                                }
                            }}
                        />
                    }
                </div>,
        },
        {
            id: 'isPayed',
            accessorKey: 'isPayed',
            cell: ({ row, getValue }) =>
                <div className="w-full flex flex-row justify-center">
                    {updatingIsPayed !== undefined && updatingIsPayed === row.original._id
                        ? <CircularLoading />
                        : <CheckBox
                            containerProps={{ className: 'w-fit' }}
                            colorForeground='success'
                            inputProps={{
                                checked: row.original.isPayed,
                                readOnly: updatesImmutableOrder === false,
                                onChange: updatesImmutableOrder === false ? undefined : async (e) => {
                                    e.stopPropagation();

                                    setUpdatingIsPayed(row.original._id);
                                    try {
                                        const data = { orderId: row.original._id, order: { isPayed: !(Boolean(getValue())) } };
                                        const r = await authFetchData(`${getApiUrl()}/orders/immutables`, { method: 'PATCH', body: JSON.stringify(data) });
                                        if (!r.response || !r.response.ok) {
                                            feedback.push({ node: t('UpdateOrder.updateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } });
                                            return;
                                        }

                                        feedback.push({ node: t('UpdateOrder.updateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } });

                                        await init(page.offset, page.limit);
                                    } finally { setUpdatingIsPayed(undefined); }
                                }
                            }}
                        />
                    }
                </div>,
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
                            onClick={() => setUpdatingOrder(row.original._id)}
                        >
                            {updatingOrder === undefined || updatingOrder !== row.original._id ? <EditIcon /> : <CircularLoadingIcon />}
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
                        <Button variant='outline' onClick={async () => {
                            setRefreshing(true)
                            try {
                                await init(page.offset, page.limit);
                            } finally { setRefreshing(false) }
                        }}>{refreshing ? <CircularLoadingIcon /> : <RefreshCwIcon />}{t('Orders.Refresh')}</Button>,
                        <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Orders.Filters')}</Button>,
                        <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Orders.Sorts')}</Button>,
                        <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSearchByUser(true)}><SearchIcon />{t('Orders.SearchByUser')}</Button>,
                        // createsOrder && <Button fgColor='success' variant='outline' onClick={() => setOpenCreateOrderModal(true)}><PlusIcon />{t('Orders.Create')}</Button>,
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

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={updatingOrder !== undefined}
                onClose={() => setUpdatingOrder(undefined)}
            >
                <UpdateOrder
                    order={orders.find(f => f._id === updatingOrder)}
                    onFinish={async shouldRefresh => { if (shouldRefresh) await init(page.offset, page.limit) }}
                />
            </Modal>
        </>
    )
}
