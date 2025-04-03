import { authFetchData, getApiUrl, getAuthApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CheckBox } from "@/src/Components/Base/CheckBox"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { t } from "i18next"
import { useContext, useEffect, useState } from "react"
import { array, object, string } from "yup"

export function CreateRole({ onFinish }: { onFinish?: (shouldRefresh?: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [privileges, setPrivileges] = useState<{ _id: string, name: 'string' }[]>([])
    const [selectedPrivilegeIds, setSelectedPrivilegeIds] = useState<string[]>([])

    const [roleName, setRoleName] = useState<string | undefined>(undefined)

    const [displayName, setDisplayName] = useState<{ [k: string]: string } | undefined>(undefined)
    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    console.log('CreateRole', { privileges, selectedPrivilegeIds, roleName, displayName, languages, loading, submitting, })

    const submit = async () => {
        if (!roleName || roleName.trim() === '')
            return

        setSubmitting(true)
        try {
            const r = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'post', body: JSON.stringify({ name: roleName, displayName, privileges: selectedPrivilegeIds }) })
            if (r?.response && r?.response?.ok) {
                if (onFinish)
                    onFinish(true)
            } else
                feedback.push({ node: t('CreateRole.creationFailure'), color: { fgColor: 'error' } })
        } finally { setSubmitting(false) }
    }

    useEffect(() => {
        Promise.all([
            authFetchData(`${getAuthApiUrl()}/privileges/all`),
            fetch(`${getApiUrl()}/languages`, { headers: { 'Accept': 'application/json' } }),
        ])
            .then(async r => {
                const ps = r[0]
                if (ps.response && ps.response?.ok && array().required().of(object().shape({ name: string().required(), _id: string().required() })).isValidSync(ps?.data))
                    setPrivileges(ps.data as any)

                if (r[1].ok)
                    setLanguages(await r[1].json())

                setLoading(false)
            })
    }, [])

    return (
        <Stack direction="vertical">
            <h5 className="text-center text-xl">{t('CreateRole.createRole')}</h5>

            <Separator />

            {/* Role name */}
            <Input value={roleName ?? ''} label={t('CreateRole.roleName')} labelId={t('CreateRole.roleName')} onChange={(e) => setRoleName(e.target.value)} />

            {languages &&
                <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                    <div className="text-lg">{t('CreateRole.DisplayNameTitle')}</div>

                    {languages.map((l, i) =>
                        <Stack key={i} direction="vertical">
                            <Input placeholder={l} value={displayName ? displayName[l] ?? '' : ''} onChange={(e) => setDisplayName({ ...displayName, [l]: e.target.value })} />
                        </Stack>
                    )}
                </Stack>
            }

            <Stack direction="vertical" size={1} stackProps={{ className: "border rounded-lg shadow-xl h-[10cm] overflow-y-auto px-2" }}>
                {loading
                    ? <Stack stackProps={{ className: 'size-full items-center justify-center' }}><CircularLoading size='lg' /></Stack>
                    : privileges.map((p, i) =>
                        <Stack key={i} size={1}>
                            <CheckBox
                                inputProps={{
                                    checked: selectedPrivilegeIds.find(f => f === p._id) !== undefined, onChange: (e) => {
                                        if (selectedPrivilegeIds.find(f => f === p._id) !== undefined)
                                            setSelectedPrivilegeIds(selectedPrivilegeIds.filter(f => f !== p._id))
                                        else
                                            setSelectedPrivilegeIds([...selectedPrivilegeIds, p._id])
                                    }
                                }}
                                label={p.name}
                            />
                        </Stack>
                    )}
            </Stack>

            <Button disabled={submitting || !roleName || roleName.trim() === '' || selectedPrivilegeIds.length === 0} onClick={submit}>{submitting ? <CircularLoadingIcon /> : t('CreateRole.done')}</Button>
        </Stack>
    )
}
