import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { authFetch, authFetchData, extractImagesFromZip, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { t } from "i18next";
import { PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array } from "yup";
import { Stack } from "@/src/Components/Base/Stack";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { Input } from "@/src/Components/Base/Input";
import { Textarea } from "@/src/shadcn/components/ui/textarea";
import { Category } from "../Categories/index.d";
import { Select } from "@/src/Components/Base/Select";
import { Product } from './index.d'
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { Modal } from "@/src/Components/Base/Modal";
import { uptime } from "process";

export function UpdateProduct({ productId, onFinish }: { productId: string, onFinish?: (shouldRefresh: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [product, setProduct] = useState<Product | undefined>(undefined)

    const [uploading, setUploading] = useState(false)
    const uploadRef = useRef<HTMLInputElement>(null)
    const [images, setImages] = useState<string[]>(undefined)
    const [image, setImage] = useState<string>(undefined)

    const [languages, setLanguages] = useState([])

    const [searchCategory, setSearchCategory] = useState<string>('')
    const [searchedCategories, setSearchedCategories] = useState<string[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    const [searchTag, setSearchTag] = useState<string>('')
    const [searchedTags, setSearchedTags] = useState<string[]>([])
    const [tags, setTags] = useState<{ _id: string, name: string }[]>([])

    const id = useRef(0)
    const getId = () => {
        id.current += 1
        return id.current
    }
    const [customProperties, setCustomProperties] = useState<{ id: number, key: string, value: string }[]>([])
    const [suggestedProperties, setSuggestedProperties] = useState<string[]>([])

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    console.log('UpdateProduct', { product, images, languages, searchCategory, searchedCategories, categories, searchTag, searchedTags, tags, customProperties, suggestedProperties, loading, submitting })

    useEffect(() => {
        const keyDown = e => { if (e.key === 'Escape') setImage(undefined) }
        window.addEventListener('keydown', keyDown)

        Promise.all([
            fetchData(`${getApiUrl()}/categories`),
            fetchData(`${getApiUrl()}/tags`),
            // should be cached in future releases
            fetchData(`${getApiUrl()}/languages`),
            fetchData(`${getApiUrl()}/products/${productId}`),
            fetchData(`${getApiUrl()}/products/pictures/${productId}`),
        ])
            .then(async r => {
                console.log('UpdateProduct r', r)

                if (r[0].response && r[0].response.ok && array().required().isValidSync(r[0].data))
                    setCategories(r[0].data)

                if (r[1].response && r[1].response.ok && array().required().isValidSync(r[1].data))
                    setTags(r[1].data)

                if (r[2].response && r[2].response.ok && array().required().isValidSync(r[2].data))
                    setLanguages(r[2].data)

                if (r[3].response && r[3].response.ok)
                    setProduct(r[3].data[0])

                if (r[4].response && r[4].response.ok)
                    setImages(r[4].data.map(m => m._id))

                setLoading(false)
            })

        return () => {
            images?.forEach((url) => URL.revokeObjectURL(url));
            if (image !== undefined)
                URL.revokeObjectURL(image)
            window.removeEventListener('keydown', keyDown)
        };
    }, [])

    const submit = async () => {
        for (const key in product?.price) {
            if (Object.prototype.hasOwnProperty.call(product?.price, key)) {
                const price = product?.price[key].toString();
                if (price.endsWith('.'))
                    return
            }
        }

        setSubmitting(true)
        try {
            const data = {
                id: productId,
                product: {
                    ...product,
                    ...Object.fromEntries(customProperties.map(cp => [cp.key, cp.value]))
                }
            }

            const r = await authFetchData(`${getApiUrl()}/products`, { method: 'post', body: JSON.stringify(data) })
            if (r.response && r.response?.ok) {
                if (onFinish)
                    onFinish(true)
            } else
                feedback.push({ node: t('UpdateProduct.CreationFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
        } finally { setSubmitting(false) }
    }

    return (
        loading
            ? <CircularLoading />
            : (
                !product
                    ? t('UpdateProduct.ProductNotFound')
                    : <Stack direction="vertical" stackProps={{ className: 'mt-4 h-max' }}>
                        <div className="text-3xl">
                            {t('UpdateProduct.title')}
                        </div>

                        <Separator />

                        {/* First Row */}
                        <Stack>
                            <Input
                                innerContainerProps={{ className: 'flex-grow' }}
                                containerProps={{ className: 'w-full' }}
                                label={t('UpdateProduct.name')}
                                labelId={t('UpdateProduct.name')}
                                value={product?.name ?? ''}
                                onChange={(e) => setProduct({ ...product, name: e.target.value.trim() })}
                            />
                        </Stack>

                        {/* Second Row */}
                        <Stack>
                            <CheckBox
                                label={t('UpdateProduct.isAvailable')}
                                containerProps={{ className: 'w-full justify-between' }}
                                labelFirst={true}
                                inputProps={{ checked: product?.isAvailable, onChange: (e) => setProduct({ ...product, isAvailable: e.target.checked }) }}
                            />

                        </Stack>

                        {/* Third Row */}
                        <Stack stackProps={{ className: 'overflow-y-auto' }}>
                            {/* First Column */}
                            <Stack direction="vertical" stackProps={{ className: 'w-[calc(50%-(0.75rem)/2)]' }}>

                                {languages &&
                                    <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 overflow-y-auto" }}>
                                        <div className="text-lg">{t('UpdateProduct.DisplayNameTitle')}</div>

                                        {languages.map((l, i) =>
                                            <Stack key={i} direction="vertical">
                                                <Input placeholder={l} value={product?.displayName ? product?.displayName[l] ?? '' : ''} onChange={(e) => setProduct({ ...product, displayName: { ...product?.displayName, [l]: e.target.value.trim() } })} />
                                            </Stack>
                                        )}
                                    </Stack>
                                }

                                {languages &&
                                    <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 overflow-y-auto" }}>
                                        <div className="text-lg">{t('UpdateProduct.DescriptionTitle')}</div>

                                        {languages.map((l, i) =>
                                            <Stack key={i} direction="vertical">
                                                <Textarea placeholder={l} value={product?.description ? product?.description[l] ?? '' : ''} onChange={(e) => setProduct({ ...product, description: { ...product?.description, [l]: e.target.value.trim() } })} />
                                            </Stack>
                                        )}
                                    </Stack>
                                }
                            </Stack>

                            {/* Second Column */}
                            <Stack direction="vertical" stackProps={{ className: 'w-[calc(50%-(0.75rem)/2)]' }}>
                                <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 overflow-y-auto" }}>
                                    <div className="text-lg">{t('UpdateProduct.DisplayNameTitle')}</div>

                                    {['IRR', 'USD'].map((l, i) =>
                                        <Stack key={i} direction="vertical">
                                            <Input
                                                placeholder={l}
                                                value={product?.price ? (product?.price[l]?.toString() ?? '') : ''}
                                                onChange={(e) => e.target.value.trim().match(/^[0-9]?([0-9]+(\.+[0-9]*)*)*$/) !== null ? setProduct({ ...product, price: { ...product?.price, [l]: Number(e.target.value.trim()) } }) : undefined}
                                                errorText={product?.price && product?.price[l] && product?.price[l]?.toString()?.match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) === null ? t('UpdateProduct.priceInputError') : undefined}
                                            />
                                        </Stack>
                                    )}
                                </Stack>
                            </Stack>
                        </Stack>

                        <Separator />

                        {/* Forth Row */}
                        <Stack stackProps={{ className: 'h-[7cm]' }}>
                            {/* Categories */}
                            <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4 *:px-2' }}>
                                <div className="text-lg">{t('UpdateProduct.Categories')}</div>

                                <Separator className="mx-2 w-auto" />

                                <Select
                                    onValueSelect={e => { }}
                                    listContainerProps={{ stackProps: { className: 'max-h-[10cm] overflow-y-auto' } }}
                                    inputProps={{
                                        containerProps: { className: "flex-grow" },
                                        labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                        className: 'pl-8',
                                        startIcon: <SearchIcon />,
                                        value: searchCategory ?? '',
                                        onChange: (e) => {
                                            let v = e.target.value.trim()
                                            setSearchCategory(v)
                                            if (!v)
                                                setSearchedCategories([])
                                            else
                                                setSearchedCategories(categories?.filter(f => f.name.toLocaleLowerCase().includes(v.toLocaleLowerCase())).map(m => m.name.toLocaleLowerCase()))
                                        }
                                    }}
                                    stopPropagation={true}
                                >
                                    {...categories?.filter(f => searchedCategories.includes(f.name.toLocaleLowerCase()))?.map((c, i) =>
                                        <Fragment key={i}>
                                            <CheckBox
                                                label={c.name}
                                                inputProps={{
                                                    checked: product?.categories?.find(f => f === c.name) !== undefined,
                                                    onChange: (e) => {
                                                        if (e.target.checked && product?.categories?.find(f => f === c.name) === undefined)
                                                            setProduct({ ...product, categories: [...product?.categories, c.name] })
                                                        if (!e.target.checked && product?.categories?.find(f => f === c.name) !== undefined)
                                                            setProduct({ ...product, categories: product?.categories?.filter(f => f !== c.name) })
                                                    }
                                                }}
                                            />
                                            {i !== searchedCategories.length - 1 && <Separator />}
                                        </Fragment>
                                    )}
                                </Select>

                                <Separator className="mx-2 w-auto" />

                                <Stack direction="vertical" size={1}>
                                    {categories.map((c, i) =>
                                        <CheckBox
                                            key={i}
                                            label={c.name}
                                            inputProps={{
                                                checked: product?.categories?.find(f => f === c.name) !== undefined,
                                                onChange: (e) => {
                                                    if (e.target.checked && product?.categories?.find(f => f === c.name) === undefined)
                                                        setProduct({ ...product, categories: [...product?.categories, c.name] })
                                                    if (!e.target.checked && product?.categories?.find(f => f === c.name) !== undefined)
                                                        setProduct({ ...product, categories: product?.categories?.filter(f => f !== c.name) })
                                                }
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Stack>

                            {/* Tags */}
                            <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4 *:px-2' }}>
                                <div className="text-lg px-2">{t('UpdateProduct.Tags')}</div>

                                <Separator className="mx-2 w-auto" />

                                <Select
                                    onValueSelect={e => { }}
                                    listContainerProps={{ stackProps: { className: 'max-h-[10cm] overflow-y-auto' } }}
                                    inputProps={{
                                        containerProps: { className: "flex-grow" },
                                        labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                        className: 'pl-8',
                                        startIcon: <SearchIcon />,
                                        value: searchTag ?? '',
                                        onChange: (e) => {
                                            let v = e.target.value.trim()
                                            setSearchTag(v)
                                            if (!v)
                                                setSearchedCategories([])
                                            else
                                                setSearchedTags(tags?.filter(f => f.name.toLocaleLowerCase().includes(v.toLocaleLowerCase())).map(m => m.name.toLocaleLowerCase()))
                                        }
                                    }}
                                    stopPropagation={true}
                                >
                                    {...tags?.filter(f => searchedTags.includes(f.name.toLocaleLowerCase()))?.map((c, i) =>
                                        <Fragment key={i}>
                                            <CheckBox
                                                label={c.name}
                                                inputProps={{
                                                    checked: product?.tags?.find(f => f === c.name) !== undefined,
                                                    onChange: (e) => {
                                                        if (e.target.checked && product?.tags?.find(f => f === c.name) === undefined)
                                                            setProduct({ ...product, tags: [...product?.tags, c.name] })
                                                        if (!e.target.checked && product?.tags?.find(f => f === c.name) !== undefined)
                                                            setProduct({ ...product, tags: product?.tags?.filter(f => f !== c.name) })
                                                    }
                                                }}
                                            />
                                            {i !== searchedTags.length - 1 && <Separator />}
                                        </Fragment>
                                    )}
                                </Select>

                                <Separator className="mx-2 w-auto" />

                                <Stack direction="vertical" size={1}>
                                    {tags.map((tag, i) =>
                                        <CheckBox
                                            key={i}
                                            label={tag.name}
                                            inputProps={{
                                                checked: product?.tags?.find(f => f === tag.name) !== undefined,
                                                onChange: (e) => {
                                                    if (e.target.checked && product?.tags?.find(f => f === tag._id) === undefined)
                                                        setProduct({ ...product, tags: [...product?.tags, tag.name] })
                                                    if (!e.target.checked && product?.tags?.find(f => f === tag._id) !== undefined)
                                                        setProduct({ ...product, tags: product?.tags?.filter(f => f !== tag._id) })
                                                }
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Stack>
                        </Stack>

                        <Separator />

                        {/* Fifth Row */}
                        <Stack direction="vertical" stackProps={{ className: 'max-h-[10cm] overflow-y-auto' }}>
                            {
                                product && Object.entries(product)
                                    .filter(e => ['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',].includes(e[0]) === false)
                                    .map(m =>
                                        <Stack key={m[0]} stackProps={{ className: 'items-center justify-between' }}>
                                            <Input containerProps={{ className: "flex-grow" }} value={m[0]} readOnly />
                                            <Input containerProps={{ className: "flex-grow" }} placeholder={t('UpdateProduct.Value')} value={(m[1] as any) ?? ''} onChange={(e) => setProduct({ ...product, [m[0]]: e.target.value.trim() })} />
                                            <Button isIcon variant="text" fgColor="error" onClick={() => setProduct(Object.fromEntries(Object.entries(product).filter(f => f[0] !== m[0])) as any)}><Trash2Icon /></Button>
                                        </Stack>
                                    )
                            }
                            {customProperties.map(cp =>
                                <Stack key={cp.id} stackProps={{ className: 'items-center justify-between' }}>
                                    {categories?.filter(f => product?.categories?.includes(f.name))?.find(f => f?.recommendedProductProperties.length > 0) !== undefined
                                        ? <Input containerProps={{ className: "flex-grow" }} placeholder={t('UpdateProduct.Field')} value={cp.key ?? ''} onChange={(e) => { cp.key = e.target.value; setCustomProperties([...customProperties]) }} />
                                        : <Select
                                            onValueSelect={e => { cp.key = e; setCustomProperties([...customProperties]) }}
                                            inputProps={{
                                                containerProps: { className: "flex-grow" },
                                                labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                                value: cp.key ?? '',
                                                onChange: (e) => {
                                                    cp.key = e.target.value.trim()
                                                    setCustomProperties([...customProperties])
                                                    setSuggestedProperties(categories?.filter(f => product?.categories?.includes(f.name))?.reduce((p, c) => p.concat(c.recommendedProductProperties.filter(f => f.name.includes(cp.key)).map(m => m.name) ?? []), []))
                                                }
                                            }}
                                            stopPropagation={true}
                                        >
                                            {...suggestedProperties.map((s, i) =>
                                                <Fragment key={i}>
                                                    <Select.Item value={s} displayValue={s}>
                                                        {s}
                                                    </Select.Item>
                                                    <Separator />
                                                </Fragment>
                                            )}
                                        </Select>
                                    }

                                    <Input containerProps={{ className: "flex-grow" }} placeholder={t('UpdateProduct.Value')} value={cp.value ?? ''} onChange={(e) => { cp.value = e.target.value; setCustomProperties([...customProperties]) }} />

                                    <Button isIcon variant="text" fgColor="error" onClick={() => setCustomProperties([...customProperties.filter(f => f.id !== cp.id)])}><Trash2Icon /></Button>
                                </Stack>
                            )}

                            <div className="text-center w-full">
                                <Button isIcon fgColor='success' variant="text" onClick={() => setCustomProperties([...customProperties, { id: getId(), key: '', value: '' }])}><PlusIcon /></Button>
                            </div>
                        </Stack>

                        <Separator />

                        <Stack stackProps={{ className: 'flex-wrap items-start' }}>
                            {
                                images === undefined
                                    ? <CircularLoadingIcon />
                                    : images?.map((m, i) =>
                                        <div key={i} className="relative w-[3cm]">
                                            <img src={`${getApiUrl()}/products/picture/${m}`} className="w-full relative" loading="lazy" />
                                            <div className="size-full absolute top-0 hover:bg-[#00000080]" onClick={() => setImage(m)} />
                                        </div>
                                    )
                            }
                            <Input
                                className='hidden'
                                type="file"
                                multiple={true}
                                inputRef={uploadRef}
                                onChange={async e => {
                                    setUploading(true)
                                    try {
                                        let size = 0
                                        const formData = new FormData()
                                        for (const file of e.target.files) {
                                            formData.append(file.name, file)
                                            size += file.size
                                        }

                                        const r = await authFetchData(`${getApiUrl()}/products/pictures/${productId}`, {
                                            method: 'post',
                                            body: formData,
                                            headers: {
                                                Accept: 'application/json',
                                                'Content-Length': size.toString(),
                                            }
                                        }, false)

                                        if (!r.response || !r?.response?.ok) {
                                            feedback.push({ node: t('UpdateProduct.failedToUploadImage'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                            return
                                        }

                                        const picturesResult = await fetchData(`${getApiUrl()}/products/pictures/${productId}`)
                                        if (!picturesResult.response || !picturesResult?.response?.ok)
                                            feedback.push({ node: t('UpdateProduct.FailedToFetchIMages'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                        else
                                            setImages(picturesResult.data.map(m => m._id))

                                    } finally { setUploading(false) }
                                }}
                            />
                            <Button isIcon variant="text" fgColor='success' onClick={() => { if (uploadRef) uploadRef.current.click() }}>{uploading ? <CircularLoadingIcon /> : <PlusIcon />}</Button>
                        </Stack>
                        <Modal
                            modalContainerProps={{ className: 'max-h-screen h-max' }}
                            useResponsiveContainer={false}
                            childrenContainerProps={{ className: 'w-auto bg-transparent p-0' }}
                            open={image !== undefined}
                            onClose={() => setImage(undefined)}
                        >
                            <img src={image} className="h-max relative" loading="lazy" />
                        </Modal>

                        <Separator />

                        <Button
                            disabled={
                                submitting ||
                                !product?.name.trim() ||
                                Object.entries(product?.price ?? {}).find(f => !f[0].trim() || !f[1].toString().trim()) !== undefined ||
                                Object.entries(product?.displayName ?? {}).find(f => !f[0].trim() || !f[1].toString().trim()) !== undefined ||
                                customProperties.find(f => !f.key.trim() || !f.value.trim()) !== undefined
                            }
                            onClick={submit}
                        >
                            {submitting ? <CircularLoading /> : t('UpdateProduct.Update')}
                        </Button>
                    </Stack>
            )
    )
}
