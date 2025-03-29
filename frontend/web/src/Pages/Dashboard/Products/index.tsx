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
import { FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array } from "yup";
import { DropdownMenu } from "@/src/Components/Base/DropdownMenu";
import { ColumnDef } from "@tanstack/react-table";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { Modal } from "@/src/Components/Base/Modal";
import { Stack } from "@/src/Components/Base/Stack";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { Input } from "@/src/Components/Base/Input";
import { Textarea } from "@/src/shadcn/components/ui/textarea";

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

    const [openCreate, setOpenCreate] = useState(false)

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
                        <Button variant='outline' onClick={async () => await init(page.offset, page.limit)}><RefreshCwIcon />{t('Products.Refresh')}</Button>,
                        <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Products.Filters')}</Button>,
                        <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Products.Sorts')}</Button>,
                        <Button fgColor='success' variant='outline' onClick={() => setOpenCreate(true)}><PlusIcon />{t('Products.Create')}</Button>,
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

            <Modal open={openCreate} onClose={() => setOpenCreate(false)}>
                <ProductCreate
                    onFinish={(shouldRefresh) => {
                        setOpenCreate(false)
                        if (shouldRefresh)
                            init(page.limit, page.offset)
                    }}
                />
            </Modal>
        </>
    )
}

export function ProductCreate({ onFinish }: { onFinish?: (shouldRefresh: boolean) => void }) {
    const [languages, setLanguages] = useState([])
    const [categories, setCategories] = useState<{ _id: string, name: string }[]>([])
    const [tags, setTags] = useState<{ _id: string, name: string }[]>([])

    const [selectedTags, setSelectedTags] = useState([])
    const [selectedCategories, setSelectedCategories] = useState([])

    const [name, setName] = useState(undefined)
    const [displayName, setDisplayName] = useState<{ [k: string]: string } | undefined>(undefined)
    const [description, setDescription] = useState(undefined)
    const [price, setPrice] = useState<{ [k: string]: string } | undefined>(undefined)

    const [isAvailable, setIsAvailable] = useState(true)

    const [customProperties, setCustomProperties] = useState<{ key: string, value: string }[]>([])

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetchData(`${getApiUrl()}/categories`),
            fetchData(`${getApiUrl()}/tags`),
            // should be cached in future releases
            fetchData(`${getApiUrl()}/languages`),
        ])
            .then(r => {
                if (r[0].response && r[0].response.ok && array().required().isValidSync(r[0].data))
                    setCategories(r[0].data)

                if (r[1].response && r[1].response.ok && array().required().isValidSync(r[1].data))
                    setTags(r[1].data)

                if (r[2].response && r[2].response.ok && array().required().isValidSync(r[2].data))
                    setLanguages(r[2].data)

                setLoading(false)
            })
    }, [])

    const submit = async () => { }

    return (
        loading
            ? <CircularLoading />
            : <Stack direction="vertical" stackProps={{ className: 'mt-8 h-max overflow-y-auto' }}>
                {/* First Row  */}
                <Stack stackProps={{ className: 'h-[5cm]' }}>
                    {/* Categories */}
                    <Stack size={1} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg' }}>
                        {categories.map((c, i) =>
                            <CheckBox
                                key={i}
                                label={c.name}
                                inputProps={{
                                    onChange: (e) => {
                                        if (e.target.checked && selectedCategories.find(f => f._id === c._id) === undefined)
                                            setSelectedCategories([...selectedCategories, c])
                                        if (!e.target.checked && selectedCategories.find(f => f._id === c._id) !== undefined)
                                            setSelectedCategories([...selectedCategories.filter(f => f._id !== c._id)])
                                    }
                                }}
                            />
                        )}
                    </Stack>

                    {/* Tags */}
                    <Stack size={1} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg' }}>
                        {tags.map((tag, i) =>
                            <CheckBox
                                key={i}
                                label={tag.name}
                                inputProps={{
                                    onChange: (e) => {
                                        if (e.target.checked && selectedTags.find(f => f._id === tag._id) === undefined)
                                            setSelectedTags([...selectedTags, tag])
                                        if (!e.target.checked && selectedTags.find(f => f._id === tag._id) !== undefined)
                                            setSelectedTags([...selectedTags.filter(f => f._id !== tag._id)])
                                    }
                                }}
                            />
                        )}
                    </Stack>
                </Stack>

                <Separator />

                {/* Second Row */}
                <Stack stackProps={{ className: 'overflow-y-auto' }}>
                    {/* First Column */}
                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <Input value={name ?? ''} label={t('CreateProduct.name')} labelId={t('CreateProduct.name')} onChange={(e) => setName(e.target.value)} />

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 min-h-[5cm] overflow-y-auto" }}>
                                <div className="text-lg">{t('CreateProduct.DisplayNameTitle')}</div>

                                {languages.map(l =>
                                    <Stack direction="vertical">
                                        <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })} />
                                    </Stack>
                                )}
                            </Stack>
                        }

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 min-h-[5cm] overflow-y-auto" }}>
                                <div className="text-lg">{t('CreateProduct.DescriptionTitle')}</div>

                                {languages.map(l =>
                                    <Stack direction="vertical">
                                        <Textarea placeholder={l} value={description ? description[l] ?? '' : ''} onChange={(e) => setDescription({ ...description, [l]: e.target.value })} />
                                    </Stack>
                                )}
                            </Stack>
                        }
                    </Stack>

                    {/* Second Column */}
                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <CheckBox
                            label={t('CreateProduct.isAvailable')}
                            inputProps={{ checked: isAvailable, onChange: (e) => setIsAvailable(e.target.checked) }}
                        />

                        <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 max-h-[5cm] overflow-y-auto" }}>
                            <div className="text-lg">{t('CreateProduct.DisplayNameTitle')}</div>

                            {['IRR', 'USD'].map(l =>
                                <Stack direction="vertical">
                                    <Input
                                        placeholder={l}
                                        value={displayName ? displayName[l] ?? '' : ''}
                                        onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                </Stack>

                <Separator />

                {/* Second Row */}
                <Stack stackProps={{ className: 'max-h-[10cm] overflow-y-auto' }}>
                    {customProperties.map((cp, i) =>
                        <Stack>
                            <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })} />
                            <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })} />
                        </Stack>
                    )}

                    <div className="text-center w-full">
                        <Button isIcon fgColor='success' variant="text" onClick={() => setCustomProperties([...customProperties, { key: '', value: '' }])}><PlusIcon /></Button>
                    </div>
                </Stack>

                <Separator />

                <Button onClick={submit}>{t('CreateProduct.Create')}</Button>
            </Stack>
    )
}
