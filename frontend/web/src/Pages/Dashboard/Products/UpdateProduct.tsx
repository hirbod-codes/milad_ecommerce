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

    const [selectedTags, setSelectedTags] = useState<{ _id: string, name: string }[]>([])
    const [selectedCategories, setSelectedCategories] = useState<Category[]>([])

    const [name, setName] = useState(undefined)
    const [displayName, setDisplayName] = useState<{ [k: string]: string } | undefined>(undefined)
    const [description, setDescription] = useState(undefined)
    const [price, setPrice] = useState<{ [k: string]: number } | undefined>(undefined)

    const [isAvailable, setIsAvailable] = useState(true)

    const id = useRef(0)
    const getId = () => {
        id.current += 1
        return id.current
    }
    const [customProperties, setCustomProperties] = useState<{ id: number, key: string, value: string }[]>([])
    const [suggestedProperties, setSuggestedProperties] = useState<string[]>([])

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    console.log('CreateProduct', { languages, categories, tags, selectedTags, selectedCategories, name, displayName, description, price, isAvailable, customProperties, loading, submitting })

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

    const submit = async () => {
        setSubmitting(true)
        try {
            const data = {
                tags: selectedTags.map(st => st.name),
                categories: selectedCategories.map(sc => sc.name),
                name,
                displayName,
                price,
                isAvailable,
                ...Object.fromEntries(customProperties.map(cp => [cp.key, cp.value]))
            }

            const r = await authFetchData(`${getApiUrl()}/products`, { method: 'post', body: JSON.stringify(data) })
            if (r.response && r.response?.ok) {
                if (onFinish)
                    onFinish(true)
            } else
                feedback.push({ node: t('CreateProduct.CreationFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
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
                        <div className="text-lg px-2">{t('CreateProduct.Categories')}</div>

                        <Separator className="mx-2 w-auto" />

                        <Stack direction="vertical" size={1}>
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
                    </Stack>

                    {/* Tags */}
                    <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4' }}>
                        <div className="text-lg px-2">{t('CreateProduct.Tags')}</div>

                        <Separator className="mx-2 w-auto" />

                        <Stack direction="vertical" size={1}>
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
                </Stack>

                <Separator />

                {/* Second Row */}
                <Stack stackProps={{ className: 'overflow-y-auto' }}>
                    {/* First Column */}
                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <Input value={name ?? ''} label={t('CreateProduct.name')} labelId={t('CreateProduct.name')} onChange={(e) => setName(e.target.value.trim())} />

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 min-h-[5cm] overflow-y-auto" }}>
                                <div className="text-lg">{t('CreateProduct.DisplayNameTitle')}</div>

                                {languages.map(l =>
                                    <Stack direction="vertical">
                                        <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value.trim() })} />
                                    </Stack>
                                )}
                            </Stack>
                        }

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 min-h-[5cm] overflow-y-auto" }}>
                                <div className="text-lg">{t('CreateProduct.DescriptionTitle')}</div>

                                {languages.map(l =>
                                    <Stack direction="vertical">
                                        <Textarea placeholder={l} value={description ? description[l] ?? '' : ''} onChange={(e) => setDescription({ ...description, [l]: e.target.value.trim() })} />
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
                                        onChange={(e) => e.target.value.trim().match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) !== null ? setPrice({ ...price, [l]: Number(e.target.value.trim()) }) : undefined}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                </Stack>

                <Separator />

                {/* Third Row */}
                <Stack direction="vertical" stackProps={{ className: 'max-h-[10cm] overflow-y-auto' }}>
                    {customProperties.map(cp =>
                        <Stack key={cp.id} stackProps={{ className: 'items-center justify-between' }}>
                            {selectedCategories.find(c => c?.recommendedProductProperties?.length > 0) === undefined
                                ? <Input containerProps={{ className: "flex-grow" }} placeholder={t('CreateProduct.Field')} value={cp.key ?? ''} onChange={(e) => { cp.key = e.target.value; setCustomProperties([...customProperties]) }} />
                                : <Select
                                    onValueSelect={(e: '$and' | '$or') => { cp.key = e; setCustomProperties([...customProperties]) }}
                                    inputProps={{
                                        containerProps: { className: "flex-grow" },
                                        labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                        value: cp.key ?? '',
                                        onChange: (e) => {
                                            cp.key = e.target.value.trim()
                                            setCustomProperties([...customProperties])
                                            setSuggestedProperties(selectedCategories.reduce((p, c) => p.concat(c.recommendedProductProperties.filter(f => f.name.includes(cp.key)).map(m => m.name) ?? []), []))
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

                            <Input containerProps={{ className: "flex-grow" }} placeholder={t('CreateProduct.Value')} value={cp.value ?? ''} onChange={(e) => { cp.value = e.target.value; setCustomProperties([...customProperties]) }} />

                            <Button isIcon variant="text" fgColor="error" onClick={() => setCustomProperties([...customProperties.filter(f => f.id !== cp.id)])}><Trash2Icon /></Button>
                        </Stack>
                    )}

                    <div className="text-center w-full">
                        <Button isIcon fgColor='success' variant="text" onClick={() => setCustomProperties([...customProperties, { id: getId(), key: '', value: '' }])}><PlusIcon /></Button>
                    </div>
                </Stack>

                <Separator />

                <Button disabled={submitting || !name || Object.values(price).find(f => f === undefined) !== undefined || Object.keys(price).length === 0} onClick={submit}>{submitting ? <CircularLoading /> : t('CreateProduct.Create')}</Button>
            </Stack>
    )
}
