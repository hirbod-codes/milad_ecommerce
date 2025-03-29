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
import { FilterIcon, ListFilterIcon, RefreshCwIcon } from "lucide-react";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array } from "yup";
import { DropdownMenu } from "@/src/Components/Base/DropdownMenu";
import { ColumnDef } from "@tanstack/react-table";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";

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
    const feedback = useContext(FeedbackContext)!

    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    const [products, setProducts] = useState<any[]>([])

    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const [openFilter, setOpenFilter] = useState(false)
    const [filters, setFilters] = useState<Filters | undefined>(undefined)

    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const [openSort, setOpenSort] = useState(false)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [page, setPage] = useState<{ limit: number, offset: number }>({ limit: 25, offset: 0 })

    console.log('Products', { products, openFilter, filters, openSort, ask, page })

    const init = async (offset: number, limit: number): Promise<boolean> => {
        console.log('init()')

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
        init(page.limit, page.offset)
            .finally(() => setLoading(false))
    }, [])

    let dataGridGradientColor = ColorStatic.parse(themeOptions.colors.primary[themeOptions.mode].main).toRgb()
    dataGridGradientColor.setAlpha(0.1)

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

    const additionalColumns: ColumnDef<any>[] = []

    return (
        <>
            {!loading &&
                <DataGrid
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
                        <Button variant='outline' onClick={async () => await init(page.offset, page.limit)}><RefreshCwIcon />{t('Visits.Refresh')}</Button>,
                        <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Visits.Filters')}</Button>,
                        <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Visits.Sorts')}</Button>,
                    ]}
                />
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
        </>
    )
}
