import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Input } from "@/src/Components/Base/Input"
import { Modal } from "@/src/Components/Base/Modal"
import { Stack } from "@/src/Components/Base/Stack"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { t } from "i18next"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useContext, useEffect, useState } from "react"
import { array } from "yup"

export function Tags() {
    const feedback = useContext(FeedbackContext)

    const [tags, setTags] = useState<{ _id: string, name: string, view: number, displayName: { [k: string]: string } }[]>([])

    const [openCreateTagModal, setOpenCreateTagModal] = useState(false)
    const [name, setName] = useState(undefined)
    const [displayName, setDisplayName] = useState({})
    const [languages, setLanguages] = useState([])

    const [deletingId, setDeletingId] = useState(undefined)

    const [loading, setLoading] = useState(true)

    console.log('Tags', { tags, loading })

    const init = async () => {
        const r = await Promise.all([
            fetchData(`${getApiUrl()}/tags`),
            fetchData(`${getApiUrl()}/languages`),
        ])
        console.log('r', r)
        if (r[0].response && r[0]?.response?.ok && array().required().isValidSync(r[0].data))
            setTags(r[0]?.data)

        if (r[1].response && r[1]?.response?.ok && array().required().isValidSync(r[1].data))
            setLanguages(r[1].data)

        setLoading(false)
    }

    useEffect(() => {
        init()
    }, [])

    const deleteTag = async (id: string) => {
        setDeletingId(id)
        try {
            const r = await authFetchData(`${getApiUrl()}/tags`, { method: 'delete', body: JSON.stringify({ id }) })
            if (!r.response || !r.response?.ok)
                feedback.push({ node: t('Tags.deletionFailure'), color: { fgColor: 'error' } })
        } finally { setDeletingId(undefined); init() }
    }

    const create = async () => {
        const r = await authFetchData(`${getApiUrl()}/tags`, { method: 'post', body: JSON.stringify({ name, displayName }) })
        if (!r.response || !r.response?.ok)
            feedback.push({ node: t('Tags.creationFailure'), color: { fgColor: 'error' } })

        setOpenCreateTagModal(false)
        await init()
    }

    return (
        <>
            <Stack direction="vertical" stackProps={{ className: 'border rounded-lg p-4 justify-start size-full overflow-y-auto' }}>
                <Button size='md' variant="text" fgColor='success' onClick={() => setOpenCreateTagModal(true)} className="w-fit">
                    {t('Tags.Create')}
                    <PlusIcon />
                </Button>

                {tags.map(tag =>
                    <Stack stackProps={{ className: 'justify-between' }}>
                        {tag.name}

                        <Button isIcon variant="text" fgColor='error' onClick={() => deleteTag(tag._id)}>
                            {deletingId === tag._id ? <CircularLoading size="md" /> : <Trash2Icon />}
                        </Button>
                    </Stack>
                )}
            </Stack>

            <Modal
                onClose={() => { setOpenCreateTagModal(false) }}
                open={openCreateTagModal}
            >
                <Stack direction="vertical">
                    <h5 className="text-center text-xl">{t('Tags.createTag')}</h5>

                    <Separator />

                    {/* Tag name */}
                    <Input value={name ?? ''} label={t('Tags.name')} labelId={t('Tags.name')} onChange={(e) => setName(e.target.value)} />

                    {!loading && languages &&
                        <>
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                                <div className="text-lg">{t('Tags.DisplayNameTitle')}</div>

                                {languages.map(l =>
                                    <Stack direction="vertical">
                                        <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })} />
                                    </Stack>
                                )}
                            </Stack>
                        </>
                    }

                    <Button disabled={!name || name.trim() === ''} onClick={create}>{t('Tags.create')}</Button>
                </Stack>
            </Modal>
        </>
    )
}
