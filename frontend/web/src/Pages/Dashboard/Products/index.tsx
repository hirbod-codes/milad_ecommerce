import { Filter, Filters } from "@/src/Components/SearchFilter/index.d";
import { SearchFilter } from "@/src/Components/SearchFilter";
import { ComponentProps, useContext, useEffect, useRef, useState } from "react";
import { fetchData, getApiUrl } from "@/src/Backend/helpers";
import { ColorStatic } from "@/src/Lib/Colors/ColorStatic";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DataGrid } from "@/src/Components/DataGrid";
import { Ask } from "@/src/Components/Ask";
import { Button } from "@/src/Components/Base/Button";
import { t } from "i18next";
import { EditIcon, FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
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

export function Products() {
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

    const [page, setPage] = useState<{ limit: number, offset: number }>({ limit: 25, offset: 0 })

    console.log('Products', { products, openFilter, filters, openSort, ask, page })

    const init = async (offset: number, limit: number): Promise<boolean> => {
        const res = await fetchData(`${getApiUrl()}/products?limit=${limit}&skip=${offset}${filters === undefined ? '' : '&filter=' + JSON.stringify(formatFilters(filters))}`)
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

    const deleteProduct = async (_id: string) => {
    }

    let dataGridGradientColor = ColorStatic.parse(themeOptions.colors.primary[themeOptions.mode].main).toRgb()
    dataGridGradientColor.setAlpha(0.1)

    const createsProduct = privileges.find(f => f === 'create-category') !== undefined
    const updatesProduct = privileges.find(f => f === 'update-category') !== undefined
    const deletesProduct = privileges.find(f => f === 'delete-category') !== undefined

    const overWriteColumns: ColumnDef<any>[] = [
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
                                setAsk({ open: true, title: t('Products.deletionTitle'), content: t('Products.deletionContent'), successAction: () => deleteProduct(row.original._id), failureAction: () => setAsk({ ...ask, open: false }) });
                            }}
                        >
                            {deletingProduct === undefined || deletingProduct !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                </Stack>
        }
    ]

    return (
        <>
            {!loading
                ? <DataGrid
                    containerProps={{ stackProps: { style: { backgroundImage: `linear-gradient(to bottom right, ${dataGridGradientColor.toHex()} , transparent)` } } }}
                    configName='products'
                    data={products}
                    overWriteColumns={overWriteColumns}
                    additionalColumns={additionalColumns}
                    loading={loading}
                    hasPagination
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
