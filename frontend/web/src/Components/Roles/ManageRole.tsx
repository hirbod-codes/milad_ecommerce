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
import { Role } from "."

export function ManageRole({ role: roleInput, onFinish }: { role?: Role, onFinish?: (role: Role, hasChanged: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [privileges, setPrivileges] = useState<{ _id: string, name: 'string' }[]>([])

    const [role, setRole] = useState<Role | undefined>(roleInput)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    console.log('ManageRole', { privileges, role, loading, submitting })

    const submit = async () => {
        setSubmitting(true)
        try {
            if (roleInput !== undefined) {
                const r = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'patch', body: JSON.stringify({ id: role._id, role: { privileges: role?.privileges ?? [] } }) })
                if (!r?.response || !r?.response?.ok)
                    feedback.push({ node: t('ManageRole.updateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                else
                    feedback.push({ node: t('ManageRole.updateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } })
            } else {
                const r = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'patch', body: JSON.stringify(role) })
                if (!r?.response || !r?.response?.ok)
                    feedback.push({ node: t('ManageRole.createFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                else
                    feedback.push({ node: t('ManageRole.createSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } })
            }

            if (onFinish)
                onFinish(role, true)
        } finally { setSubmitting(false) }
    }

    useEffect(() => {
        Promise.all([
            authFetchData(`${getAuthApiUrl()}/privileges/all`),
            roleInput !== undefined && authFetchData(`${getAuthApiUrl()}/roles?ids=${role._id}`),
            fetch(`${getApiUrl()}/languages`, { headers: { 'Accept': 'application/json' } }),
        ])
            .then(async r => {
                const ps = r[0]
                if (ps.response && ps.response?.ok && array().required().of(object().shape({ name: string().required(), _id: string().required() })).isValidSync(ps?.data))
                    setPrivileges(ps.data as any)

                if (roleInput !== undefined && r[1].response && r[1].response?.ok && array().required().isValidSync(r[1]?.data))
                    setRole(r[1].data[0])

                if (r[2].ok)
                    setLanguages(await r[2].json())

                setLoading(false)
            })
    }, [])

    return (
        <Stack direction="vertical">
            {roleInput === undefined
                ? <h5 className="text-center text-xl">{t('ManageRole.createRole')}</h5>
                : <h5 className="text-center text-xl">{t('ManageRole.updateRole')}</h5>
            }

            {loading
                ? <Stack stackProps={{ className: 'size-full items-center justify-center' }}><CircularLoading size='lg' /></Stack>
                : <>
                    <Separator />

                    {/* Role name */}
                    {roleInput === undefined
                        ? <Input value={role?.name ?? ''} onChange={e => setRole({ ...role, name: e.target.value.trim() })} label={t('ManageRole.roleName')} labelId={t('ManageRole.roleName')} />
                        : <Input value={role.name} disabled={true} label={t('ManageRole.roleName')} labelId={t('ManageRole.roleName')} />
                    }

                    {languages &&
                        <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                            <div className="text-lg">{t('ManageRole.DisplayNameTitle')}</div>

                            {languages.map((l, i) =>
                                <Stack key={i} direction="vertical">
                                    <Input placeholder={l} value={role?.displayName ? role?.displayName[l] ?? '' : ''} onChange={(e) => setRole({ ...role, displayName: { ...role?.displayName, [l]: e.target.value } })} />
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
                                            checked: role?.privileges?.find(f => f === p._id) !== undefined,
                                            onChange: (e) => {
                                                if (role?.privileges?.find(f => f === p._id) !== undefined)
                                                    setRole({ ...role, privileges: role?.privileges?.filter(f => f !== p._id) ?? [] })
                                                else
                                                    setRole({ ...role, privileges: [...role?.privileges, p._id] })
                                            }
                                        }}
                                        label={p.name}
                                    />
                                </Stack>
                            )
                        }
                    </Stack>

                    <Button disabled={submitting} onClick={submit}>{submitting ? <CircularLoadingIcon /> : t('ManageRole.done')}</Button>
                </>
            }
        </Stack>
    )
}
