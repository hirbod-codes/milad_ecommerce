import { SearchIcon } from "lucide-react"
import { Select } from "../Base/Select"
import { ComponentProps, Fragment, useContext, useEffect, useRef, useState } from "react"
import { t } from "i18next"
import { Stack } from "../Base/Stack"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers"
import { array } from "yup"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"

export function SearchUser({ onSelect, containerProps }: { onSelect?: (user: { _id: string } & any) => void, containerProps?: ComponentProps<typeof Stack> }) {
    const feedback = useContext(FeedbackContext)

    const [mode, setMode] = useState<'phoneNumber' | 'email' | 'username'>('phoneNumber')
    const [search, setSearch] = useState<string>(undefined)

    const [searchedUsers, setSearchedUsers] = useState<{ _id: string, username: string, firstName?: string, lastName?: string }[]>([])

    const searchUser = async () => {
        if (search) {
            let r
            switch (mode) {
                case 'email':
                    r = await authFetchData(`${getAuthApiUrl()}/users?filter=${JSON.stringify({ $and: [{ "email": search }] })}`)
                    break;

                case 'phoneNumber':
                    r = await authFetchData(`${getAuthApiUrl()}/users?filter=${JSON.stringify({ $and: [{ "phoneNumber": search }] })}`)
                    break;

                case 'username':
                    r = await authFetchData(`${getAuthApiUrl()}/users?filter=${JSON.stringify({ $and: [{ "username": search }] })}`)
                    break;

                default:
                    throw new Error('Invalid mode provided!')
            }

            if (!r.response || !r.response.ok || !array().required().isValidSync(r.data))
                feedback.push({ node: t('SearchUser.searchFailed') })
            else
                setSearchedUsers(r?.data)
        }
    }

    const timer = useRef(undefined)

    useEffect(() => {
        if (timer.current !== undefined)
            clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            searchUser()
        }, 1500)
    }, [search])

    return (
        <Stack direction="vertical" {...containerProps}>
            <Select
                onValueSelect={e => setMode(e)}
                listContainerProps={{ stackProps: { className: 'max-h-[10cm] overflow-y-auto' } }}
                label={t('SearchUser.Mode')}
                inputProps={{
                    containerProps: { className: "flex-grow" },
                    labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                    className: 'pl-8',
                    value: mode ?? '',
                    readOnly: true
                }}
                stopPropagation={true}
            >
                <Select.Item value={'phoneNumber'}>
                    {t('common.phoneNumber')}
                </Select.Item>

                <Select.Item value={'email'}>
                    {t('common.email')}
                </Select.Item>

                <Select.Item value={'username'}>
                    {t('common.username')}
                </Select.Item>
            </Select>

            <Select
                onValueSelect={e => { if (onSelect) onSelect(searchedUsers.find(f => f._id === e)) }}
                listContainerProps={{ stackProps: { className: 'max-h-[10cm] overflow-y-auto' } }}
                inputProps={{
                    containerProps: { className: "flex-grow" },
                    labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                    className: 'pl-8',
                    startIcon: <SearchIcon />,
                    value: search ?? '',
                    onChange: (e) => {
                        setSearch(e.target.value.trim())
                    }
                }}
                stopPropagation={true}
            >
                {searchedUsers.map((u, i) =>
                    <Fragment key={i} >
                        <Select.Item value={u._id}>
                            <Stack stackProps={{ className: 'items-center' }}>
                                <div className="text-center text-ellipsis overflow-x-auto w-[3cm]">{u?.firstName ?? '--'}</div>
                                <Separator orientation="vertical" />
                                <div className="text-center text-ellipsis overflow-x-auto w-[3cm]">{u?.lastName ?? '--'}</div>
                                <Separator orientation="vertical" />
                                <div className="text-center text-ellipsis overflow-x-auto w-[3cm]">{u.username!}</div>
                            </Stack>
                        </Select.Item>

                        {i !== searchedUsers.length - 1 && <Separator />}
                    </Fragment>
                )}
            </Select>
        </Stack>
    )
}

