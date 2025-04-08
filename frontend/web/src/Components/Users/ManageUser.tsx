import { authFetchData, getApiUrl, getAuthApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { t } from "i18next"
import { useContext, useEffect, useRef, useState } from "react"
import { User } from "."
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Modal } from "../Base/Modal"

export function ManageUser({ user: userInput, onFinish }: { user: User, onFinish?: (user: User, hasChanged: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [user, setUser] = useState<User>(userInput)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    const [uploading, setUploading] = useState(false)
    const uploadRef = useRef<HTMLInputElement>(null)
    const [image, setImage] = useState<string>(undefined)
    const [file, setFile] = useState<{ _id?: string, file: File, url: string }>()

    console.log('ManageUser', { user, loading, submitting })

    const revokeImages = () => {
        URL.revokeObjectURL(file.url)

        if (image !== undefined)
            URL.revokeObjectURL(image)
    }

    useEffect(() => {
        const keyDown = e => { if (e.key === 'Escape') setImage(undefined) }
        window.addEventListener('keydown', keyDown)

        if (user.avatarUrl !== undefined)
            authFetchData(`${getAuthApiUrl()}/users/picture?fileId=${user.avatarUrl}`)
                .then(r => {
                    setFile({ _id: user.avatarUrl, file: r.data, url: URL.createObjectURL(r.data) })
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
                {userInput === undefined
                    ? <h5 className="text-center text-xl">{t('ManageUser.createUser')}</h5>
                    : <h5 className="text-center text-xl">{t('ManageUser.updateUser')}</h5>
                }

                <Separator />

                <Stack>
                    <Input
                        innerContainerProps={{ className: 'flex-grow' }}
                        containerProps={{ className: 'w-full' }}
                        label={t('ManageUser.firstName')}
                        labelId={t('ManageUser.firstName')}
                        value={user?.firstName ?? ''}
                        onChange={(e) => setUser({ ...user, firstName: e.target.value.trim() })}
                    />
                    <Input
                        innerContainerProps={{ className: 'flex-grow' }}
                        containerProps={{ className: 'w-full' }}
                        label={t('ManageUser.lastName')}
                        labelId={t('ManageUser.lastName')}
                        value={user?.lastName ?? ''}
                        onChange={(e) => setUser({ ...user, lastName: e.target.value.trim() })}
                    />
                </Stack>

                <Separator />

                <Stack stackProps={{ className: 'flex-wrap items-start *:py-1' }}>
                    {file &&
                        <div key={file.file.name} className="relative w-[6cm]">
                            <img src={file.url} className="w-full relative top-0" loading="lazy" />
                            <div className="size-full absolute top-0 *:hover:block z-50">
                                <div className="size-full absolute top-0 hidden bg-[#00000080]" onClick={() => setImage(file.url)} />
                                <div className="hidden absolute bottom-1 right-1">
                                    <Button
                                        isIcon
                                        variant="text"
                                        size='xs'
                                        fgColor="error"
                                        onClick={async (e) => {
                                            e.stopPropagation()

                                            if (file._id === undefined)
                                                return

                                            const r = await authFetchData(`${getApiUrl()}/users/picture`, { method: 'delete', body: JSON.stringify({ fileId: file._id }) })

                                            if (!r.response || !r.response.ok)
                                                feedback.pushError({ node: t('ManageUser.pictureDeleteFailed') })

                                            URL.revokeObjectURL(file.url)

                                            setFile(undefined)
                                        }}
                                    >
                                        <Trash2Icon />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    }

                    <Input
                        className='hidden'
                        type="file"
                        multiple={true}
                        inputRef={uploadRef}
                        onChange={async e => {
                            revokeImages()

                            let f = { file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) }
                            setFile(f)

                            if (userInput !== undefined) {
                                setUploading(true)

                                try {
                                    let size = 0
                                    const formData = new FormData()
                                    formData.append(f.file.name, f.file)
                                    size += f.file.size

                                    const r = await authFetchData(`${getApiUrl()}/users/picture/${user._id}`, {
                                        method: 'post',
                                        body: formData,
                                        headers: {
                                            Accept: 'application/json',
                                            'Content-Length': size.toString(),
                                        }
                                    }, false)

                                    if (!r.response || !r?.response?.ok)
                                        feedback.pushError({ node: t('ManageUser.failedToUploadImage') })
                                    else
                                        setUser({ ...user, avatarUrl: r.data?.id })
                                } finally { setUploading(false) }
                            }
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
                    disabled={submitting}
                    onClick={async () => {
                        setSubmitting(true)
                        try {
                            const data: any = {
                                id: user._id,
                                user,
                            }
                            console.log('data', data)

                            const r = await authFetchData(`${getApiUrl()}/users`, { method: 'PATCH', body: JSON.stringify(data) })
                            if (!r.response || !r.response?.ok)
                                feedback.pushError({ node: t('ManageUser.UpdateFailed') })
                        } finally { setSubmitting(false) }
                    }}
                >
                    {submitting ? <CircularLoading /> : t('ManageUser.Update')}
                </Button>
            </Stack >
    )
}
