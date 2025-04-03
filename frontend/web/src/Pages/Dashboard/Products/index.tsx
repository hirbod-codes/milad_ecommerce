import { Filter, Filters } from "@/src/Components/SearchFilter/index.d";
import { SearchFilter } from "@/src/Components/SearchFilter";
import { ComponentProps, useContext, useEffect, useRef, useState } from "react";
import { authFetchData, fetchData, formatCurrency, formatFilters, formatNumber, getApiUrl } from "@/src/Backend/helpers";
import { ColorStatic } from "@/src/Lib/Colors/ColorStatic";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DataGrid } from "@/src/Components/DataGrid";
import { Ask } from "@/src/Components/Ask";
import { Button } from "@/src/Components/Base/Button";
import { t } from "i18next";
import { EditIcon, EyeIcon, FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array } from "yup";
import { DropdownMenu } from "@/src/Components/Base/DropdownMenu";
import { ColumnDef } from "@tanstack/react-table";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { Modal } from "@/src/Components/Base/Modal";
import { CreateProduct } from "./CreateProduct";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { Stack } from "@/src/Components/Base/Stack";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { CircularLoadingScreen } from "@/src/Components/Base/CircularLoadingScreen";
import { UpdateProduct } from "./UpdateProduct";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { Input } from "@/src/Components/Base/Input";
import { ProductsDataGrid } from "@/src/Components/Products/ProductsDataGrid";

export function Products() {
    const privileges = useContext(AuthContext).privileges

    const feedback = useContext(FeedbackContext)!

    const createsProduct = privileges?.find(f => f === 'create-product') !== undefined
    const updatesProduct = privileges?.find(f => f === 'update-product') !== undefined
    const deletesProduct = privileges?.find(f => f === 'delete-product') !== undefined
    const assignsProduct = privileges?.find(f => f === 'assign-product') !== undefined

    return (
        <ProductsDataGrid
            dataGridProps={{
                configName: 'Products',
                defaultColumnVisibilityModel: { _id: false },
                defaultColumnOrderModel: ['actions', 'name', 'displayName', 'privileges']
            }}
            functionality={{
                create: createsProduct,
                update: updatesProduct,
                delete: deletesProduct,
                filter: true,
                sort: true,
                search: true,
                pagination: true,
            }}
        />
    )
}
/**
 * Note: static fields of Product model is hard coded.
 * @returns 
 */
export function Productss() {
    const privileges = useContext(AuthContext).privileges
    const feedback = useContext(FeedbackContext)!

    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    const [products, setProducts] = useState<any[]>([])

    const [openCreateProductModal, setOpenCreateProductModal] = useState(false)
    const [openUpdateProductModal, setOpenUpdateProductModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(undefined)
    const [deletingProduct, setDeletingProduct] = useState(undefined)

    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const [openFilter, setOpenFilter] = useState(false)
    const [filters, setFilters] = useState<Filters | undefined>(undefined)

    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const [openSort, setOpenSort] = useState(false)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [page, setPage] = useState<{ limit: number, offset: number }>({ limit: 10, offset: 0 })

    const [showingTags, setShowingTags] = useState<string | undefined>(undefined)
    const [showingCategories, setShowingCategories] = useState<string | undefined>(undefined)
    const [showCustomFields, setShowCustomFields] = useState<any | undefined>(undefined)

    console.log('Products', { products, openFilter, filters, openSort, ask, page })

    const init = async (offset: number, limit: number): Promise<boolean> => {
        const res = await fetchData(`${getApiUrl()}/products?limit=${limit}&skip=${limit * offset}${filters === undefined ? '' : '&filter=' + JSON.stringify(formatFilters(filters))}`)
        if (!res.response || !res.response.ok || !array().required().isValidSync(res.data)) {
            feedback.push({
                node: t('Products.failedToFetchProducts'),
                color: { fgColor: 'error' }
            })
            return false
        }

        if (res.data.length >= 0) {
            setProducts(res.data)
            return true
        }

        return false
    }

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        init(page.offset, page.limit)
            .finally(() => setLoading(false))
    }, [])

    const deleteProduct = async (id: string) => {
        const r = await authFetchData(`${getApiUrl()}/products`, { method: 'delete', body: JSON.stringify({ id }) })
        if (r.response && r.response?.ok)
            feedback.push({ node: t('UpdateProduct.CreationSuccessful'), color: { bgColor: 'success', fgColor: 'success-foreground' } })
        else
            feedback.push({ node: t('UpdateProduct.CreationFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
    }

    let dataGridGradientColor = ColorStatic.parse(themeOptions.colors.primary[themeOptions.mode].main).toRgb()
    dataGridGradientColor.setAlpha(0.1)

    const createsProduct = privileges.find(f => f === 'create-category') !== undefined
    const updatesProduct = privileges.find(f => f === 'update-category') !== undefined
    const deletesProduct = privileges.find(f => f === 'delete-category') !== undefined

    const columns: ColumnDef<any>[] = [
        {
            id: '_id',
            accessorKey: '_id',
        },
        {
            id: 'actions',
            accessorKey: 'actions',
            cell: ({ row }) =>
                <Stack stackProps={{ className: "justify-center w-full" }}>
                    {
                        updatesProduct &&
                        <Button
                            isIcon
                            variant='text'
                            onClick={() => {
                                setEditingProduct(row.original._id)
                            }}
                        >
                            {editingProduct === undefined || editingProduct !== row.original._id ? <EditIcon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                    {
                        deletesProduct &&
                        <Button
                            isIcon
                            variant='text'
                            fgColor='error'
                            onClick={() => {
                                setDeletingProduct(row.original._id)
                                setAsk({
                                    open: true,
                                    title: t('Products.deletionTitle'),
                                    content: t('Products.deletionContent'),
                                    successAction: async () => { await deleteProduct(row.original._id); await init(page.offset, page.limit); setAsk({ ...ask, open: false }); },
                                    failureAction: () => { setDeletingProduct(undefined); setAsk({ ...ask, open: false }) }
                                });
                            }}
                        >
                            {deletingProduct === undefined || deletingProduct !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                </Stack>
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
            cell: ({ row, getValue }) => <div className="w-full flex flex-row justify-center">{Boolean(getValue()) ? <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='success' inputProps={{ checked: true, readOnly: true }} /> : <CheckBox containerProps={{ className: 'w-fit' }} colorForeground='error' inputProps={{ checked: false, readOnly: true }} />}</div>,
        },
        {
            id: 'customFields',
            accessorKey: 'customFields',
            cell: ({ row }) => <div className="w-full flex flex-row justify-center"><Button isIcon variant="text" onClick={() => setShowCustomFields(row.original._id)}><EyeIcon /></Button></div>,
        },
        {
            id: 'tags',
            accessorKey: 'tags',
            cell: ({ row, getValue }) => <div className="text-center w-full cursor-pointer rounded-lg hover:border text-nowrap text-ellipsis overflow-hidden" onClick={() => setShowingTags(row.original._id)}>{(getValue() as string[]).join(', ')}</div>,
        },
        {
            id: 'categories',
            accessorKey: 'categories',
            cell: ({ row, getValue }) => <div className="text-center w-full cursor-pointer rounded-lg hover:border text-nowrap text-ellipsis overflow-hidden" onClick={() => setShowingCategories(row.original._id)}>{(getValue() as string[]).join(', ')}</div>,
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
            cell: ({ getValue }) => formatNumber(configuration, getValue() as number),
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

    return (
        <>
            {!loading
                ? <DataGrid
                    containerProps={{ stackProps: { style: { backgroundImage: `linear-gradient(to bottom right, ${dataGridGradientColor.toHex()} , transparent)` } } }}
                    configName='products'
                    data={products}
                    columns={columns}
                    loading={loading}
                    hasPagination
                    defaultColumnVisibilityModel={{ _id: false, schemaVersion: false }}
                    defaultColumnOrderModel={['actions', 'name', 'displayName', 'isAvailable', 'customFields', 'price', 'description', 'tags', 'categories', 'views', 'purchaseCount', 'reviewsCount', 'averageRating', 'createdAt', 'updatedAt',]}
                    pagination={{ pageSize: page.limit, pageIndex: page.offset }}
                    onPagination={async (p) => {
                        const result = await init(p.pageIndex, p.pageSize)
                        if (result)
                            setPage({ limit: p.pageSize, offset: p.pageIndex })
                        return result
                    }}
                    appendHeaderNodes={[
                        <Button variant='outline' onClick={async () => await init(page.offset, page.limit)}><RefreshCwIcon />{t('Products.Refresh')}</Button>,
                        <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Products.Filters')}</Button>,
                        <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Products.Sorts')}</Button>,
                        createsProduct && <Button fgColor='success' variant='outline' onClick={() => setOpenCreateProductModal(true)}><PlusIcon />{t('Products.Create')}</Button>,
                    ]}
                />
                : <CircularLoadingScreen />
            }

            <Ask {...ask} onClose={() => { if (ask.failureAction) ask.failureAction(); else setAsk({ ...ask, open: false }) }} />

            <DropdownMenu
                anchorRef={filterButtonRef}
                open={openFilter}
                onOpenChange={(b) => { if (!b) setOpenFilter(false) }}
                containerProps={{ className: 'rounded-md bg-surface-container-high my-0 shadow-md' }}
            >
                <div className="w-[15cm]">
                    <SearchFilter filters={filters} setFilters={setFilters} fields={{}} />
                </div>
            </DropdownMenu>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={showCustomFields !== undefined}
                onClose={() => setShowCustomFields(undefined)}
            >
                <Stack direction="vertical" stackProps={{ className: 'w-full items-center justify-between' }}>
                    {showCustomFields && Object.entries(products.find(f => f._id === showCustomFields) ?? {}).filter(f => ['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',].includes(f[0]) === false).map(m =>
                        <Stack key={m[0]}>
                            <Input containerProps={{ className: "flex-grow" }} readOnly value={m[0]} />
                            <Input containerProps={{ className: "flex-grow" }} placeholder={t('UpdateProduct.Value')} readOnly value={m[1] as any} />
                        </Stack>
                    )}
                </Stack>
            </Modal>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={showingTags !== undefined}
                onClose={() => setShowingTags(undefined)}
            >
                <Stack direction="vertical">
                    {products?.find(f => f._id === showingTags)?.tags?.map(m =>
                        <div key={m} className="text-lg">
                            {m}
                        </div>
                    )}
                </Stack>
            </Modal>

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={showingCategories !== undefined}
                onClose={() => setShowingCategories(undefined)}
            >
                <Stack direction="vertical">
                    {products?.find(f => f._id === showingCategories)?.categories?.map(m =>
                        <div key={m} className="text-lg">
                            {m}
                        </div>
                    )}
                </Stack>
            </Modal>

            <Modal open={openCreateProductModal} onClose={() => setOpenCreateProductModal(false)}>
                <CreateProduct
                    onFinish={(shouldRefresh) => {
                        setOpenCreateProductModal(false)
                        if (shouldRefresh)
                            init(page.limit, page.offset)
                    }}
                />
            </Modal>

            <Modal open={editingProduct !== undefined} onClose={() => setEditingProduct(undefined)}>
                <UpdateProduct
                    productId={editingProduct}
                    onFinish={(shouldRefresh) => {
                        setEditingProduct(undefined)
                        if (shouldRefresh)
                            init(page.limit, page.offset)
                    }}
                />
            </Modal>
        </>
    )
}
