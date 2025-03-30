import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { t } from "i18next";
import { PlusIcon, Trash2Icon } from "lucide-react";
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

export function UpdateProduct({ productId, onFinish }: { productId: string, onFinish?: (shouldRefresh: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [languages, setLanguages] = useState([])
    const [categories, setCategories] = useState<Category[]>([])
    const [tags, setTags] = useState<{ _id: string, name: string }[]>([])

    const [product, setProduct] = useState(undefined)

    const id = useRef(0)
    const getId = () => {
        id.current += 1
        return id.current
    }
    const [customProperties, setCustomProperties] = useState<{ id: number, key: string, value: string }[]>([])
    const [suggestedProperties, setSuggestedProperties] = useState<string[]>([])

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    console.log('UpdateProduct', {})

    useEffect(() => {
        Promise.all([
            fetchData(`${getApiUrl()}/categories`),
            fetchData(`${getApiUrl()}/tags`),
            // should be cached in future releases
            fetchData(`${getApiUrl()}/languages`),
            fetchData(`${getApiUrl()}/products/${productId}`),
        ])
            .then(r => {
                if (r[0].response && r[0].response.ok && array().required().isValidSync(r[0].data))
                    setCategories(r[0].data)

                if (r[1].response && r[1].response.ok && array().required().isValidSync(r[1].data))
                    setTags(r[1].data)

                if (r[2].response && r[2].response.ok && array().required().isValidSync(r[2].data))
                    setLanguages(r[2].data)

                if (r[3].response && r[3].response.ok)
                    setProduct(r[3].data)

                setLoading(false)
            })
    }, [])

    const submit = async () => {
        for (const key in product?.price) {
            if (Object.prototype.hasOwnProperty.call(product?.price, key)) {
                const price = product?.price[key] as string;
                if (price.endsWith('.'))
                    return
            }
        }

        setSubmitting(true)
        try {
            const data = {
                // tags: selectedTags.map(st => st.name),
                // categories: selectedCategories.map(sc => sc.name),
                // name,
                // displayName,
                // price,
                // isAvailable,
                ...Object.fromEntries(customProperties.map(cp => [cp.key, cp.value]))
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
            : <Stack direction="vertical" stackProps={{ className: 'mt-8 h-max overflow-y-auto' }}>
                {/* First Row  */}
                <Stack stackProps={{ className: 'h-[5cm]' }}>
                    {/* Categories */}
                    <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4' }}>
                        <div className="text-lg px-2">{t('UpdateProduct.Categories')}</div>

                        <Separator className="mx-2 w-auto" />

                        <Stack direction="vertical" size={1}>
                            {categories.map((c, i) =>
                                <CheckBox
                                    key={i}
                                    label={c.name}
                                    inputProps={{
                                        checked: product?.categories?.find(f => f._id === c._id) !== undefined,
                                        onChange: (e) => {
                                            if (e.target.checked && product?.categories?.find(f => f._id === c._id) === undefined)
                                                setProduct({ ...product, categories: [...categories, c] })
                                            if (!e.target.checked && product?.categories?.find(f => f._id === c._id) !== undefined)
                                                setProduct({ ...product, categories: categories.filter(f => f._id !== c._id) })
                                        }
                                    }}
                                />
                            )}
                        </Stack>
                    </Stack>

                    {/* Tags */}
                    <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4' }}>
                        <div className="text-lg px-2">{t('UpdateProduct.Tags')}</div>

                        <Separator className="mx-2 w-auto" />

                        <Stack direction="vertical" size={1}>
                            {tags.map((tag, i) =>
                                <CheckBox
                                    key={i}
                                    label={tag.name}
                                    inputProps={{
                                        checked: product.tags?.find(f => f._id === tag._id) !== undefined,
                                        onChange: (e) => {
                                            if (e.target.checked && product.tags?.find(f => f._id === tag._id) === undefined)
                                                setProduct({ ...product, tags: [...tags, tag] })
                                            if (!e.target.checked && product.tags?.find(f => f._id === tag._id) !== undefined)
                                                setProduct({ ...product, tags: tags.filter(f => f._id !== tag._id) })
                                        }
                                    }}
                                />
                            )}
                        </Stack>
                    </Stack>
                </Stack>

                <Separator />

                {/* Second Row */}
                <Stack stackProps={{ className: 'overflow-y-auto' }}>
                    {/* First Column */}
                    <Stack direction="vertical" stackProps={{ className: 'w-[calc(50%-(0.75rem)/2)]' }}>
                        <Input value={product.name ?? ''} placeholder={t('UpdateProduct.name')} onChange={(e) => setProduct({ ...product, name: e.target.value.trim() })} />

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 min-h-[5cm] overflow-y-auto" }}>
                                <div className="text-lg">{t('UpdateProduct.DisplayNameTitle')}</div>

                                {languages.map((l, i) =>
                                    <Stack key={i} direction="vertical">
                                        <Input placeholder={l} value={product.displayName ? product.displayName[l] ?? '' : ''} onChange={(e) => setProduct({ ...product, displayName: { ...product.displayName, [l]: e.target.value.trim() } })} />
                                    </Stack>
                                )}
                            </Stack>
                        }

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 min-h-[5cm] overflow-y-auto" }}>
                                <div className="text-lg">{t('UpdateProduct.DescriptionTitle')}</div>

                                {languages.map((l, i) =>
                                    <Stack key={i} direction="vertical">
                                        <Textarea placeholder={l} value={product.description ? product.description[l] ?? '' : ''} onChange={(e) => setProduct({ ...product, description: { ...product.description, [l]: e.target.value.trim() } })} />
                                    </Stack>
                                )}
                            </Stack>
                        }
                    </Stack>

                    {/* Second Column */}
                    <Stack direction="vertical" stackProps={{ className: 'w-[calc(50%-(0.75rem)/2)]' }}>
                        <CheckBox
                            label={t('UpdateProduct.isAvailable')}
                            inputProps={{ checked: product.isAvailable, onChange: (e) => setProduct({ ...product, isAvailable: e.target.checked }) }}
                        />

                        <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 max-h-[5cm] overflow-y-auto" }}>
                            <div className="text-lg">{t('UpdateProduct.DisplayNameTitle')}</div>

                            {['IRR', 'USD'].map((l, i) =>
                                <Stack key={i} direction="vertical">
                                    <Input
                                        placeholder={l}
                                        value={product?.price ? (product?.price[l] ?? '') : ''}
                                        onChange={(e) => e.target.value.trim().match(/^[0-9]?([0-9]+(\.+[0-9]*)*)*$/) !== null ? setProduct({ ...product, price: { ...product?.price, [l]: Number(e.target.value.trim()) } }) : undefined}
                                        errorText={product?.price && product?.price[l] && product?.price[l]?.match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) === null ? t('UpdateProduct.priceInputError') : undefined}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                </Stack>

                <Separator />

                {/* Third Row */}
                <Stack direction="vertical" stackProps={{ className: 'max-h-[10cm] overflow-y-auto' }}>
                    {
                        Object.entries(product)
                            .filter(e => !['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',].includes(e[0]))
                            .map(m =>
                                <Stack key={m[0]} stackProps={{ className: 'items-center justify-between' }}>
                                    <Input containerProps={{ className: "flex-grow" }} value={m[0]} readOnly />
                                    <Input containerProps={{ className: "flex-grow" }} placeholder={t('UpdateProduct.Value')} value={(m[1] as any) ?? ''} onChange={(e) => setProduct({ ...product, [m[0]]: e.target.value.trim() })} />
                                    <Button isIcon variant="text" fgColor="error" onClick={() => setProduct({ ...Object.fromEntries(Object.entries(product).filter(f => f[0] !== m[0])) })}><Trash2Icon /></Button>
                                </Stack>
                            )
                    }
                    {customProperties.map(cp =>
                        <Stack key={cp.id} stackProps={{ className: 'items-center justify-between' }}>
                            {product?.categories?.find(c => c?.recommendedProductProperties?.length > 0) === undefined
                                ? <Input containerProps={{ className: "flex-grow" }} placeholder={t('UpdateProduct.Field')} value={cp.key ?? ''} onChange={(e) => { cp.key = e.target.value; setCustomProperties([...customProperties]) }} />
                                : <Select
                                    onValueSelect={(e: '$and' | '$or') => { cp.key = e; setCustomProperties([...customProperties]) }}
                                    inputProps={{
                                        containerProps: { className: "flex-grow" },
                                        labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                        value: cp.key ?? '',
                                        onChange: (e) => {
                                            cp.key = e.target.value.trim()
                                            setCustomProperties([...customProperties])
                                            setSuggestedProperties(product?.categories?.reduce((p, c) => p.concat(c.recommendedProductProperties.filter(f => f.name.includes(cp.key)).map(m => m.name) ?? []), []))
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

                <Button disabled={submitting} onClick={submit}>{submitting ? <CircularLoading /> : t('UpdateProduct.Update')}</Button>
            </Stack>
    )
}
