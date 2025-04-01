import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { t } from "i18next";
import { PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array, string } from "yup";
import { Stack } from "@/src/Components/Base/Stack";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { Input } from "@/src/Components/Base/Input";
import { Textarea } from "@/src/shadcn/components/ui/textarea";
import { Category } from "../Categories/index.d";
import { Select } from "@/src/Components/Base/Select";
import { ProductCreate, staticCreateFields, staticFields } from './index.d'
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { Modal } from "@/src/Components/Base/Modal";

export function CreateProduct({ onFinish }: { onFinish?: (shouldRefresh: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [product, setProduct] = useState<ProductCreate>({})
    const [files, setFiles] = useState<{ file: File, url: string }[]>([])

    const [uploading, setUploading] = useState(false)
    const uploadRef = useRef<HTMLInputElement>(null)
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

    console.log('CreateProduct', { product, files, uploading, image, languages, searchCategory, searchedCategories, categories, searchTag, searchedTags, tags, customProperties, suggestedProperties, loading, submitting })

    const revokeImages = () => {
        files?.forEach((f) => URL.revokeObjectURL(f.url));
        if (image !== undefined)
            URL.revokeObjectURL(image)
    }

    useEffect(() => {
        const keyDown = e => { if (e.key === 'Escape') setImage(undefined) }
        window.addEventListener('keydown', keyDown)

        Promise.all([
            fetchData(`${getApiUrl()}/categories`),
            fetchData(`${getApiUrl()}/tags`),
            // should be cached in future releases
            fetchData(`${getApiUrl()}/languages`),
        ])
            .then(async r => {
                console.log('CreateProduct r', r)

                if (r[0].response && r[0].response.ok && array().required().isValidSync(r[0].data))
                    setCategories(r[0].data)

                if (r[1].response && r[1].response.ok && array().required().isValidSync(r[1].data))
                    setTags(r[1].data)

                if (r[2].response && r[2].response.ok && array().required().isValidSync(r[2].data))
                    setLanguages(r[2].data)

                setLoading(false)
            })

        return () => {
            revokeImages()
            window.removeEventListener('keydown', keyDown)
        };
    }, [])

    return (
        loading
            ? <CircularLoading />
            : <Stack direction="vertical" stackProps={{ className: 'mt-4 h-max' }}>
                <div className="text-3xl">
                    {t('CreateProduct.title')}
                </div>

                <Separator />

                {/* First Row */}
                <Stack>
                    <Input
                        innerContainerProps={{ className: 'flex-grow' }}
                        containerProps={{ className: 'w-full' }}
                        label={t('CreateProduct.name')}
                        labelId={t('CreateProduct.name')}
                        value={product?.name ?? ''}
                        onChange={(e) => setProduct({ ...product, name: e.target.value.trim() })}
                    />
                </Stack>

                {/* Second Row */}
                <Stack>
                    <CheckBox
                        label={t('CreateProduct.isAvailable')}
                        containerProps={{ className: 'w-full justify-between' }}
                        labelFirst={true}
                        inputProps={{ checked: product?.isAvailable, onChange: (e) => setProduct({ ...product, isAvailable: e.target.checked }) }}
                    />

                </Stack>

                {/* Third Row */}
                {/* Common Options */}
                <Stack stackProps={{ className: 'overflow-y-auto' }}>
                    {/* First Column */}
                    <Stack direction="vertical" stackProps={{ className: 'w-[calc(50%-(0.75rem)/2)]' }}>

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 overflow-y-auto" }}>
                                <div className="text-lg">{t('CreateProduct.DisplayNameTitle')}</div>

                                {languages.map((l, i) =>
                                    <Stack key={i} direction="vertical">
                                        <Input placeholder={l} value={product?.displayName ? product?.displayName[l] ?? '' : ''} onChange={(e) => setProduct({ ...product, displayName: { ...product?.displayName, [l]: e.target.value.trim() } })} />
                                    </Stack>
                                )}
                            </Stack>
                        }

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 overflow-y-auto" }}>
                                <div className="text-lg">{t('CreateProduct.DescriptionTitle')}</div>

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
                            <div className="text-lg">{t('CreateProduct.DisplayNameTitle')}</div>

                            {['IRR', 'USD'].map((l, i) =>
                                <Stack key={i} direction="vertical">
                                    <Input
                                        placeholder={l}
                                        value={product?.price ? (product?.price[l]?.toString() ?? '') : ''}
                                        onChange={(e) => {
                                            let v: number = e.target.value.trim().match(/^[0-9]?([0-9]+(\.+[0-9]*)*)*$/) === null ? e.target.value.trim() as any : Number(e.target.value.trim())
                                            setProduct({ ...product, price: { ...product?.price, [l]: v } })
                                        }}
                                        errorText={product?.price && product?.price[l] && product?.price[l]?.toString()?.match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) === null ? t('CreateProduct.priceInputError') : undefined}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                </Stack>

                <Separator />

                {/* Forth Row */}
                {/* Categories and Tags */}
                <Stack stackProps={{ className: 'h-[7cm]' }}>
                    {/* Categories */}
                    <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4 *:px-2' }}>
                        <div className="text-lg">{t('CreateProduct.Categories')}</div>

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
                        <div className="text-lg px-2">{t('CreateProduct.Tags')}</div>

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
                {/* Custom Fields */}
                <Stack direction="vertical" stackProps={{ className: 'max-h-[10cm] overflow-y-auto' }}>
                    {
                        Object.entries(product)
                            .filter(e => staticFields.includes(e[0]) === false)
                            .map(m =>
                                <Stack key={m[0]} stackProps={{ className: 'items-center justify-between' }}>
                                    <Input containerProps={{ className: "flex-grow" }} value={m[0]} readOnly />
                                    <Input containerProps={{ className: "flex-grow" }} placeholder={t('CreateProduct.Value')} value={(m[1] as any) ?? ''} onChange={(e) => setProduct({ ...product, [m[0]]: e.target.value.trim() })} />
                                    <Button isIcon variant="text" fgColor="error" onClick={() => setProduct(Object.fromEntries(Object.entries(product).filter(f => f[0] !== m[0])) as any)}><Trash2Icon /></Button>
                                </Stack>
                            )
                    }
                    {customProperties.map(cp =>
                        <Stack key={cp.id} stackProps={{ className: 'items-center justify-between' }}>
                            {categories?.filter(f => product?.categories?.includes(f.name))?.find(f => f?.recommendedProductProperties.length > 0) !== undefined
                                ? <Input containerProps={{ className: "flex-grow" }} placeholder={t('CreateProduct.Field')} value={cp.key ?? ''} onChange={(e) => { cp.key = e.target.value; setCustomProperties([...customProperties]) }} />
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

                            <Input containerProps={{ className: "flex-grow" }} placeholder={t('CreateProduct.Value')} value={cp.value ?? ''} onChange={(e) => { cp.value = e.target.value; setCustomProperties([...customProperties]) }} />

                            <Button isIcon variant="text" fgColor="error" onClick={() => setCustomProperties([...customProperties.filter(f => f.id !== cp.id)])}><Trash2Icon /></Button>
                        </Stack>
                    )}

                    <div className="text-center w-full">
                        <Button isIcon fgColor='success' variant="text" onClick={() => setCustomProperties([...customProperties, { id: getId(), key: '', value: '' }])}><PlusIcon /></Button>
                    </div>
                </Stack>

                <Separator />

                {/* Sixth Row */}
                {/* Pictures */}
                <Stack stackProps={{ className: 'flex-wrap items-start *:py-1' }}>
                    {
                        files?.map((m, i) =>
                            <div key={m.file.name} className="relative w-[3cm]">
                                <img src={m.url} className="w-full relative top-0" loading="lazy" />
                                <div className="size-full absolute top-0 *:hover:block z-50">
                                    <div className="size-full absolute top-0 hidden bg-[#00000080]" onClick={() => setImage(m.url)} />
                                    <div className="hidden absolute bottom-1 right-1">
                                        <Button isIcon variant="text" size='xs' fgColor="error" onClick={async (e) => {
                                            e.stopPropagation()

                                            URL.revokeObjectURL(m.url)

                                            setFiles([...files.filter(f => f.file.name !== m.file.name)])
                                        }}><Trash2Icon /></Button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    <Input
                        className='hidden'
                        type="file"
                        multiple={true}
                        inputRef={uploadRef}
                        onChange={async e => {
                            revokeImages()

                            let fs = []
                            for (const file of e.target.files)
                                fs.push({ file, url: URL.createObjectURL(file) })
                            setFiles(fs)
                        }}
                    />
                    <Button isIcon variant="text" fgColor='success' onClick={() => { if (uploadRef) uploadRef.current.click() }}>{uploading ? <CircularLoadingIcon /> : <PlusIcon />}</Button>
                </Stack>
                <Modal
                    modalContainerProps={{ className: 'max-h-screen h-max' }}
                    useResponsiveContainer={false}
                    childrenContainerProps={{ className: 'w-auto bg-transparent p-0' }}
                    open={image !== undefined}
                    onClose={() => { URL.revokeObjectURL(image); setImage(undefined) }}
                >
                    <img src={image} className="h-max relative" loading="lazy" />
                </Modal>

                <Separator />

                <Button
                    disabled={
                        submitting ||
                        !product?.name?.trim() ||
                        !product?.price ||
                        !product?.displayName ||
                        Object.entries(product?.price).find(f => !f[0].trim() || !f[1].toString().trim() || f[1]?.toString()?.match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) === null) !== undefined ||
                        Object.entries(product?.displayName).find(f => !f[0].trim() || !f[1].toString().trim()) !== undefined ||
                        customProperties.find(f => !f.key.trim() || !f.value.trim()) !== undefined
                    }
                    onClick={async () => {
                        setSubmitting(true)
                        try {
                            const data = Object.fromEntries(Object.entries(product).filter(f => staticCreateFields.includes(f[0])))
                            const r = await authFetchData(`${getApiUrl()}/products`, { method: 'POST', body: JSON.stringify(data) })

                            if (r.response && r.response?.ok && string().required().isValidSync(r?.data?.id)) {
                                if (files !== undefined) {
                                    setUploading(true)
                                    try {
                                        let size = 0
                                        const formData = new FormData()
                                        for (const file of files) {
                                            formData.append(file.file.name, file.file)
                                            size += file.file.size
                                        }

                                        const uploadResult = await authFetchData(`${getApiUrl()}/products/pictures/${r.data.id}`, {
                                            method: 'post',
                                            body: formData,
                                            headers: {
                                                Accept: 'application/json',
                                                'Content-Length': size.toString(),
                                            }
                                        }, false)

                                        if (!uploadResult.response || !uploadResult?.response?.ok) {
                                            feedback.push({ node: t('CreateProduct.failedToUploadImage'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                            return
                                        }
                                    } finally { setUploading(false) }
                                }

                                if (onFinish)
                                    onFinish(true)
                            } else
                                feedback.push({ node: t('CreateProduct.CreationFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                        } finally { setSubmitting(false) }
                    }}
                >
                    {submitting ? <CircularLoading /> : t('CreateProduct.Create')}
                </Button>
            </Stack>
    )
}

const readFile = (file: File) => {
    return new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = event => res(event.target.result)
        reader.onerror = e => console.error(e)
        reader.readAsDataURL(file)
    })
}
