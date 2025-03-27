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

export function UpdateRole({ editingRoleId, onFinish }: { editingRoleId: string, onFinish?: (shouldRefresh?: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [privileges, setPrivileges] = useState<{ _id: string, name: 'string' }[]>([])
    const [selectedPrivilegeIds, setSelectedPrivilegeIds] = useState<string[]>([])

    const [role, setRole] = useState(undefined)

    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)

    console.log('UpdateRole', { editingRoleId, privileges, selectedPrivilegeIds, role, loading, submitting })

    const submit = async () => {
        setSubmitting(true)
        try {
            const r = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'patch', body: JSON.stringify({ id: editingRoleId, role: { privileges: selectedPrivilegeIds } }) })
            if (r?.response && r?.response?.ok) {
                if (onFinish)
                    onFinish(true)
            } else
                feedback.push({ node: t('UpdateRole.creationFailure') })
        } finally { setSubmitting(false) }
    }

    useEffect(() => {
        Promise.all([
            authFetchData(`${getAuthApiUrl()}/privileges/all`),
            authFetchData(`${getAuthApiUrl()}/roles?ids=${editingRoleId}`),
        ])
            .then(async r => {
                const ps = r[0]
                if (ps.response && ps.response?.ok && array().required().of(object().unknown(true).shape({ name: string().required(), _id: string().required() })).isValidSync(ps?.data))
                    setPrivileges(ps.data as any)

                if (r[1].response && r[1].response?.ok && array().required().isValidSync(r[1]?.data)) {
                    setRole(r[1].data[0])
                    setSelectedPrivilegeIds(r[1].data[0].privileges?.map(p => p._id))
                }

                setLoading(false)
            })
    }, [])

    return (
        <Stack direction="vertical">
            <h5 className="text-center text-xl">{t('UpdateRole.updateRole')}</h5>

            {loading || role === undefined
                ? <Stack stackProps={{ className: 'size-full items-center justify-center' }}><CircularLoading size='lg' /></Stack>
                : <>
                    <Separator />

                    {/* Role name */}
                    <Input value={role.name} disabled={true} label={t('UpdateRole.roleName')} labelId={t('UpdateRole.roleName')} />

                    {role?.displayName && Object.keys(role.displayName) &&
                        <>
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                                <div className="text-lg">{t('UpdateRole.DisplayNameTitle')}</div>

                                {Object.keys(role.displayName).map(l =>
                                    <Stack direction="vertical">
                                        <Input disabled={true} value={role.displayName[l]} />
                                    </Stack>
                                )}
                            </Stack>
                        </>
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

                    <Button disabled={submitting || selectedPrivilegeIds.length === 0} onClick={submit}>{submitting ? <CircularLoadingIcon /> : t('UpdateRole.done')}</Button>
                </>
            }
        </Stack>
    )
}
