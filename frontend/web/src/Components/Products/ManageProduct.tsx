import { authFetchData, fetchData, getApiUrl, getAuthApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CheckBox } from "@/src/Components/Base/CheckBox"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { t } from "i18next"
import { useContext, useEffect, useRef, useState } from "react"
import { array, object, string } from "yup"
import { Product, staticFields } from "./index.d"
import { CircularLoadingScreen } from "../Base/CircularLoadingScreen"
import { Textarea } from "@/src/shadcn/components/ui/textarea"
import { Select } from "../Base/Select"
import { PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"
import { Modal } from "../Base/Modal"
import { SearchCategory } from "../SearchCategory"
import { SearchTag } from "../SearchTag"

export function ManageProduct({ product: productInput, onFinish }: { product?: Product, onFinish?: (product: Product, hasChanged: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [product, setProduct] = useState<Product | undefined>(productInput)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    const [uploading, setUploading] = useState(false)
    const uploadRef = useRef<HTMLInputElement>(null)
    const [image, setImage] = useState<string>(undefined)
    const [files, setFiles] = useState<{ _id?: string, file: File, url: string }[]>([])

    const id = useRef(0)
    const getId = () => {
        id.current += 1
        return id.current
    }

    console.log('ManageProduct', { product, loading, submitting })

    const revokeImages = () => {
        files?.forEach((f) => URL.revokeObjectURL(f.url));
        if (image !== undefined)
            URL.revokeObjectURL(image)
    }

    useEffect(() => {
        const keyDown = e => { if (e.key === 'Escape') setImage(undefined) }
        window.addEventListener('keydown', keyDown)

        Promise.all([
            fetch(`${getApiUrl()}/languages`, { headers: { 'Accept': 'application/json' } }),
            productInput !== undefined && fetchData(`${getApiUrl()}/products/pictures/productIds?productIds=${productInput._id}`)
        ])
            .then(async r => {
                if (r[0].ok)
                    setLanguages(await r[0].json())

                setLoading(false)

                if (r[1].response && r[1].response.ok && array().required().isValidSync(r[1].data)) {
                    const picturesResponses = await Promise.all(r[1]?.data?.map(m =>
                        fetchData(`${getApiUrl()}/products/pictures/fileId?fileId=${m._id}`)
                    ))

                    for (const picturesResponse of picturesResponses)
                        if (!picturesResponse?.response || !picturesResponse.response?.ok || !array().required().isValidSync(picturesResponse.data))
                            feedback.pushError({ node: t('ManageProduct.failedToFetchPictures') })

                    setFiles(picturesResponses.map((m, i) => ({ _id: r[1]?.data[i], file: m.data, url: URL.createObjectURL(m.data) })))
                }
            })

        return () => {
            revokeImages()
            window.removeEventListener('keydown', keyDown)
        }
    }, [])

    return (
        loading
            ? <Stack stackProps={{ className: 'items-center justify-center' }}><CircularLoading /></Stack>
            : <Stack direction="vertical" stackProps={{ className: 'mt-4 h-max' }}>
                {productInput === undefined
                    ? <h5 className="text-center text-xl">{t('ManageProduct.createProduct')}</h5>
                    : <h5 className="text-center text-xl">{t('ManageProduct.updateProduct')}</h5>
                }

                <Separator />

                {/* First Row */}
                <Stack>
                    <Input
                        innerContainerProps={{ className: 'flex-grow' }}
                        containerProps={{ className: 'w-full' }}
                        label={t('ManageProduct.name')}
                        labelId={t('ManageProduct.name')}
                        value={product?.name ?? ''}
                        onChange={(e) => setProduct({ ...product, name: e.target.value.trim() })}
                    />
                </Stack>

                {/* Second Row */}
                <Stack>
                    <CheckBox
                        label={t('ManageProduct.isAvailable')}
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
                                <div className="text-lg">{t('ManageProduct.DisplayNameTitle')}</div>

                                {languages.map((l, i) =>
                                    <Stack key={i} direction="vertical">
                                        <Input placeholder={l} value={product?.displayName ? product?.displayName[l] ?? '' : ''} onChange={(e) => setProduct({ ...product, displayName: { ...product?.displayName, [l]: e.target.value.trim() } })} />
                                    </Stack>
                                )}
                            </Stack>
                        }

                        {languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2 overflow-y-auto" }}>
                                <div className="text-lg">{t('ManageProduct.DescriptionTitle')}</div>

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
                            <div className="text-lg">{t('ManageProduct.DisplayNameTitle')}</div>

                            {['IRR', 'USD'].map((l, i) =>
                                <Stack key={i} direction="vertical">
                                    <Input
                                        placeholder={l}
                                        value={product?.price ? (product?.price[l]?.toString() ?? '') : ''}
                                        onChange={(e) => {
                                            let v: number = e.target.value.trim().match(/^[0-9]?([0-9]+(\.+[0-9]*)*)*$/) === null ? e.target.value.trim() as any : Number(e.target.value.trim())
                                            setProduct({ ...product, price: { ...product?.price, [l]: v } })
                                        }}
                                        errorText={product?.price && product?.price[l] && product?.price[l]?.toString()?.match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) === null ? t('ManageProduct.priceInputError') : undefined}
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
                    <SearchCategory
                        selectedCategories={product?.categories ?? []}
                        onChange={(selectedCategories) => setProduct({ ...product, categories: selectedCategories })}
                    />

                    <SearchTag
                        selectedTags={product?.tags ?? []}
                        onChange={(selectedTags) => setProduct({ ...product, tags: selectedTags })}
                    />
                </Stack>

                <Separator />

                {/* Fifth Row */}
                {/* Custom Fields */}
                <Stack direction="vertical" stackProps={{ className: 'max-h-[10cm] overflow-y-auto' }}>
                    {
                        product && Object.entries(product)
                            .filter(e => staticFields.includes(e[0]) === false)
                            .map(m =>
                                <Stack key={m[0]} stackProps={{ className: 'items-center justify-between' }}>
                                    <Input containerProps={{ className: "flex-grow" }} value={m[0]} readOnly />
                                    <Input containerProps={{ className: "flex-grow" }} placeholder={t('ManageProduct.Value')} value={(m[1] as any) ?? ''} onChange={(e) => setProduct({ ...product, [m[0]]: e.target.value.trim() })} />
                                    <Button isIcon variant="text" fgColor="error" onClick={() => setProduct(Object.fromEntries(Object.entries(product).filter(f => f[0] !== m[0])) as any)}><Trash2Icon /></Button>
                                </Stack>
                            )
                    }

                    <div className="text-center w-full">
                        <Button isIcon fgColor='success' variant="text" onClick={() => setProduct(Object.fromEntries([...Object.entries(product), ['field' + getId(), '']]) as any)}><PlusIcon /></Button>
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
                                        <Button
                                            isIcon
                                            variant="text"
                                            size='xs'
                                            fgColor="error"
                                            onClick={async (e) => {
                                                e.stopPropagation()

                                                if (m._id !== undefined)
                                                    authFetchData(`${getApiUrl()}/products/picture`, { method: 'delete', body: JSON.stringify({ fileId: m._id }) })
                                                        .then(r => {
                                                            if (!r.response || !r.response.ok) {
                                                                feedback.push({ node: t('ManageProduct.pictureDeleteFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                                                return
                                                            }

                                                            URL.revokeObjectURL(m.url)

                                                            setFiles([...files.filter(f => f.file.name !== m.file.name)])
                                                        })
                                            }}
                                        >
                                            <Trash2Icon />
                                        </Button>
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

                            let fs = [...files]
                            for (const file of e.target.files)
                                fs.push({ file, url: URL.createObjectURL(file) })
                            setFiles(fs)

                            if (productInput !== undefined) {
                                setUploading(true)

                                try {
                                    let size = 0
                                    const formData = new FormData()
                                    for (const file of fs) {
                                        formData.append(file.file.name, file.file)
                                        size += file.file.size
                                    }

                                    const r = await authFetchData(`${getApiUrl()}/products/pictures/${product._id}`, {
                                        method: 'post',
                                        body: formData,
                                        headers: {
                                            Accept: 'application/json',
                                            'Content-Length': size.toString(),
                                        }
                                    }, false)

                                    if (!r.response || !r?.response?.ok) {
                                        feedback.push({ node: t('ManageProduct.failedToUploadImage'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                        return
                                    }

                                    const picturesResult = await fetchData(`${getApiUrl()}/products/pictures/${product._id}`)
                                    if (!picturesResult.response || !picturesResult?.response?.ok)
                                        feedback.push({ node: t('ManageProduct.FailedToFetchIMages'), color: { bgColor: 'error', fgColor: 'error-foreground' } })

                                    for (const file of fs)
                                        file._id = picturesResult.data.find(f => f.filename === file.file.name)?._id
                                    fs = fs.filter(f => f._id !== undefined)
                                } finally { setUploading(false) }
                            }

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
                        !product?.name.trim() ||
                        !product?.price ||
                        !product?.displayName ||
                        Object.entries(product?.price).find(f => !f[0].trim() || !f[1].toString().trim() || f[1]?.toString()?.match(/^[0-9]?([0-9]+(\.+[0-9]+)*)*$/) === null) !== undefined ||
                        Object.entries(product?.displayName).find(f => !f[0].trim() || !f[1].toString().trim()) !== undefined
                    }
                    onClick={async () => {
                        setSubmitting(true)
                        try {
                            if (productInput !== undefined) {
                                const data: any = {
                                    id: product._id,
                                    product,
                                }
                                console.log('data', data)

                                const r = await authFetchData(`${getApiUrl()}/products`, { method: 'PATCH', body: JSON.stringify(data) })
                                if (!r.response || !r.response?.ok)
                                    feedback.push({ node: t('ManageProduct.UpdateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                            } else {
                                const r = await authFetchData(`${getApiUrl()}/products`, { method: 'POST', body: JSON.stringify(product) })
                                if (!r.response || !r.response?.ok || !string().required().isValidSync(r?.data?.id))
                                    feedback.push({ node: t('ManageProduct.CreateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })

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
                            }
                        } finally { setSubmitting(false) }
                    }}
                >
                    {submitting ? <CircularLoading /> : t('ManageProduct.Update')}
                </Button>
            </Stack>
    )
}
