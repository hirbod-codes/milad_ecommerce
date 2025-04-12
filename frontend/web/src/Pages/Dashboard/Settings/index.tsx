import { useContext, useEffect, useState } from "react";
import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { Input } from "@/src/Components/Base/Input";
import { Modal } from "@/src/Components/Base/Modal";
import { Stack } from "@/src/Components/Base/Stack";
import { User } from "@/src/Components/Users";
import { ManageUser } from "@/src/Components/Users/ManageUser";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { Separator } from "@radix-ui/react-separator";
import { t } from "i18next";
import { UpdateEmail } from "./UpdateEmail";
import { Trash2Icon } from "lucide-react";
import { DeleteEmail } from "./DeleteEmail";

export function Settings() {
    const feedback = useContext(FeedbackContext)

    const [user, setUser] = useState<User | undefined>(undefined)
    const [loading, setLoading] = useState(true)

    const [modalOpen, setModalOpen] = useState({ email: false, phoneNumber: false, password: false, emailDelete: false, phoneNumberDelete: false })

    const init = () => {
        setLoading(true)
        authFetchData(`${getAuthApiUrl()}/me/users`)
            .then(r => {
                if (!r.response || !r.response?.ok || !r.data) {
                    feedback.pushError({ node: t('Settings.fetchUserDataFailed') })
                    return
                }

                setUser(r.data)
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        init()
    }, [])

    console.log('Settings', { user, loading })

    return (
        <>
            <Stack direction="vertical" stackProps={{ className: 'p-1' }}>
                {
                    loading
                        ? <Stack stackProps={{ className: 'w-full justify-center border rounded-lg py-4' }}><CircularLoading /></Stack>
                        : (
                            user
                                ? <ManageUser user={user} />
                                : <div className='w-full text-center text-5xl border rounded-2xl shadow-2xl p-4 bg-surface-container text-surface-foreground'>{t('Settings.DataNotFound')}</div>
                        )
                }

                <Stack>
                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg p-2' }}>
                            <Input disabled readOnly value={user?.email ?? ''} placeholder={t('common.email')} />
                            <Stack>
                                <Button className="flex-grow" onClick={() => setModalOpen({ ...modalOpen, email: true })}>{t('Settings.updateEmail')}</Button>
                                <Button bgColor='error' fgColor="error-foreground" onClick={() => setModalOpen({ ...modalOpen, emailDelete: true })}><Trash2Icon /></Button>
                            </Stack>
                        </Stack>

                        <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lgs p-2' }}>
                            <Input disabled readOnly value={user?.phoneNumber ?? ''} placeholder={t('common.phoneNumber')} />
                            <Stack>
                                <Button className="flex-grow" onClick={() => setModalOpen({ ...modalOpen, phoneNumber: true })}>{t('Settings.updatePhoneNumber')}</Button>
                                <Button bgColor='error' fgColor="error-foreground" onClick={() => setModalOpen({ ...modalOpen, phoneNumberDelete: true })}><Trash2Icon /></Button>
                            </Stack>
                        </Stack>
                    </Stack>

                    <Separator orientation="vertical" />

                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <Button onClick={() => setModalOpen({ ...modalOpen, password: false })}>{t('Settings.updatePassword')}</Button>
                    </Stack>
                </Stack>
            </Stack>

            <Modal
                open={modalOpen.email}
                onClose={() => setModalOpen({ ...modalOpen, email: false })}
            >
                <UpdateEmail
                    sendTo={((user?.email !== undefined && user?.phoneNumber !== undefined) || (user?.email === undefined && user?.phoneNumber === undefined)) ? undefined : (user?.email ? 'email' : 'phoneNumber')}
                    selectModes={user?.phoneNumber !== undefined && user?.email !== undefined}
                    onFinish={() => {
                        setModalOpen({ ...modalOpen, email: false });
                        init()
                    }}
                />
            </Modal>

            <Modal
                open={modalOpen.emailDelete}
                onClose={() => setModalOpen({ ...modalOpen, emailDelete: false })}
            >
                <DeleteEmail
                    sendTo={((user?.email !== undefined && user?.phoneNumber !== undefined) || (user?.email === undefined && user?.phoneNumber === undefined)) ? undefined : (user?.email ? 'email' : 'phoneNumber')}
                    selectModes={user?.phoneNumber !== undefined && user?.email !== undefined}
                    onFinish={() => {
                        setModalOpen({ ...modalOpen, emailDelete: false });
                        init()
                    }}
                />
            </Modal>
        </>
    )
}
