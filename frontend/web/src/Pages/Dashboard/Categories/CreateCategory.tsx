import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { Input } from "@/src/Components/Base/Input";
import { Stack } from "@/src/Components/Base/Stack";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { t } from "i18next";
import { useContext, useEffect, useState } from "react";
import { array } from "yup";

export function CreateCategory({ parentCategoryId, onFinish }: { parentCategoryId?: string, onFinish?: (shouldRefresh?: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [name, setName] = useState<string | undefined>(undefined)
    const [displayName, setDisplayName] = useState<{ [k: string]: string } | undefined>(undefined)
    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    console.log('CreateCategory', { name, displayName, languages })

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
        if (!name || name.trim() === '')
            return

        setSubmitting(true)
        try {
            const r = await authFetchData(`${getApiUrl()}/categories`, { method: 'post', body: JSON.stringify({ name, displayName, parentCategory: parentCategoryId }) })
            if (r?.response && r?.response?.ok) {
                if (onFinish)
                    onFinish(true)
            } else
                feedback.push({ node: t('CreateCategory.creationFailure'), color: { fgColor: 'error' } })
        } finally { setSubmitting(false) }
    }

    return (
        <>
            <Stack direction="vertical">
                <h5 className="text-center text-xl">{t('CreateCategory.createTag')}</h5>

                <Separator />

                {/* Tag name */}
                <Input value={name ?? ''} label={t('CreateCategory.name')} labelId={t('CreateCategory.name')} onChange={(e) => setName(e.target.value)} />

                {!loading && languages &&
                    <>
                        <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                            <div className="text-lg">{t('CreateCategory.DisplayNameTitle')}</div>

                            {languages.map(l =>
                                <Stack direction="vertical">
                                    <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })} />
                                </Stack>
                            )}
                        </Stack>
                    </>
                }

                <Button disabled={submitting || !name || name.trim() === ''} onClick={submit}>{submitting ? <CircularLoadingIcon /> : t('CreateCategory.create')}</Button>
            </Stack>
        </>
    )
}

