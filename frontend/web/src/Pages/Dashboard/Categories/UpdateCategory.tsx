import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { Input } from "@/src/Components/Base/Input";
import { Stack } from "@/src/Components/Base/Stack";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { t } from "i18next";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { array } from "yup";

export function UpdateCategory({ categoryId, onFinish }: { categoryId?: string, onFinish?: (shouldRefresh?: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const id = useRef(0)
    const getId = () => {
        id.current++
        return id.current
    }
    const [properties, setProperties] = useState<{ id: number, name: string, display: { [k: string]: string } }[]>([])

    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    console.log('UpdateCategory', { properties })

    const init = () => {
        Promise.all([
            fetchData(`${getApiUrl()}/languages`),
        ])
            .then(r => {
                console.log('r', r)
                if (r[0].response && r[0]?.response?.ok && array().required().isValidSync(r[0].data))
                    setLanguages(r[0].data)

                setLoading(false)
            })
    }

    useEffect(() => {
        init()
    }, [])

    const submit = async () => {
        setSubmitting(true)
        try {
            const r = await authFetchData(`${getApiUrl()}/categories`, { method: 'patch', body: JSON.stringify({ recommendedProductProperties: properties.map(({ name, display }) => ({ name, display })) }) })
            if (r?.response && r?.response?.ok) {
                if (onFinish)
                    onFinish(true)
            } else
                feedback.push({ node: t('UpdateCategory.updateFailure'), color: { fgColor: 'error' } })
        } finally { setSubmitting(false) }
    }

    return (
        <>
            <Stack direction="vertical">
                <h5 className="text-center text-xl">{t('UpdateCategory.createTag')}</h5>

                <Separator />

                <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg p-2' }}>
                    <h5 className="text-start text-md">{t('CreateCategory.createRecommendedProperties')}</h5>

                    <Separator />

                    {properties.map(p =>
                        <Stack key={p.id} direction="vertical">
                            <Stack>
                                <Input placeholder={t('UpdateCategory.field')} value={p.name} onChange={(e) => { p.name = e.target.value.trim(); setProperties([...properties]) }} />
                                <Button isIcon fgColor='error' variant="text" onClick={() => setProperties([...properties.filter(f => f.id !== p.id)])}><Trash2Icon /></Button>
                            </Stack>

                            {!loading && languages &&
                                <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                                    <div className="text-lg">{t('CreateCategory.DisplayFieldTitle')}</div>

                                    {languages.map(l =>
                                        <Stack direction="vertical">
                                            <Input placeholder={t('CreateCategory.DisplayFieldTitle')} value={p.display[l] ?? ''} onChange={e => {
                                                if (!p.display)
                                                    p.display = { [l]: e.target.value.trim() }
                                                else
                                                    p.display[l] = e.target.value.trim()

                                                setProperties({ ...properties })
                                            }} />
                                        </Stack>
                                    )}
                                </Stack>
                            }

                        </Stack>
                    )}

                    <Button isIcon fgColor='success' variant="text" onClick={() => setProperties([...properties, { id: getId(), name: '', display: {} }])}><PlusIcon /></Button>
                </Stack>

                <Button disabled={submitting || properties.length === 0} onClick={submit}>{submitting ? <CircularLoadingIcon /> : t('UpdateCategory.create')}</Button>
            </Stack>
        </>
    )
}

