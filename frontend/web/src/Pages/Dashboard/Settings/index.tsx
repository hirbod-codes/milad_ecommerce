import { useContext, useEffect, useReducer, useRef, useState } from "react";
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
import { motion, AnimatePresence } from 'framer-motion'
import { Select } from "@/src/Components/Base/Select";
import { DateTime } from "luxon";

export function Settings() {
    const feedback = useContext(FeedbackContext)

    const [user, setUser] = useState<User | undefined>(undefined)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        authFetchData(`${getAuthApiUrl()}/me/users`)
            .then(r => {
                if (!r.response || !r.response?.ok || !r.data) {
                    feedback.pushError({ node: t('Settings.fetchUserDataFailed') })
                    return
                }

                setUser(r.data)
            })
            .finally(() => setLoading(false))
    }, [])

    type State = {
        updatingEmail: { open: boolean, page: number, mode: 'email' | 'phoneNumber', code: string, sendingCode: boolean, submittingCode: boolean, email: string, sendingEmail: boolean, codeSentAt: number | undefined, counter: number | undefined }
        updatingPhoneNumber: { open: boolean, page: number }
        updatingPassword: { open: boolean, page: number }
    }

    type Action =
        'emailUpdateCodeSent' |
        'updateEmail' |
        'updateEmailPreviousPage' |
        'updatePhoneNumber' |
        'updatePassword' |
        'updatingEmailClose' |
        'emailUpdateCodeSubmitted' |
        'submitCodeForEmailUpdate' |
        { operation: 'setModeForEmailUpdate', data: 'email' | 'phoneNumber' } |
        { operation: 'setCodeForEmailUpdate', data: string } |
        { operation: 'sendCodeForEmailUpdate' } |
        { operation: 'submitCodeForEmailUpdate' } |
        { operation: 'setEmailForEmailUpdate', data: string } |
        { operation: 'sendEmailForEmailUpdate' } |
        { operation: 'setEmailUpdateCounter', data: number }

    const reducer = (state: State, arg: Action): State => {
        if (typeof arg === 'string')
            switch (arg) {
                case 'updateEmail':
                    return { ...state, updatingEmail: { ...state.updatingEmail, open: true, page: 0 } }

                case 'updateEmailPreviousPage':
                    return { ...state, updatingEmail: { ...state.updatingEmail, page: state.updatingEmail.page > 0 ? state.updatingEmail.page - 1 : 0 } }

                case 'updatingEmailClose':
                    return { ...state, updatingEmail: { ...state.updatingEmail, open: false } }

                case 'emailUpdateCodeSent':
                    return { ...state, updatingEmail: { ...state.updatingEmail, sendingCode: false, codeSentAt: DateTime.utc().toUnixInteger() } }

                case 'emailUpdateCodeSubmitted':
                    return { ...state, updatingEmail: { ...state.updatingEmail, submittingCode: false, page: 1 } }

                case 'updatePhoneNumber':
                    return { ...state, updatingPhoneNumber: { open: true, page: 0 } }

                case 'updatePassword':
                    return { ...state, updatingPassword: { open: true, page: 0 } }
            }
        else
            switch (arg.operation) {
                case 'setModeForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, mode: arg.data } }
                case 'setCodeForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, code: arg.data } }
                case 'sendCodeForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, sendingCode: true } }
                case 'submitCodeForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, submittingCode: true } }
                case 'setEmailForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, email: arg.data } }
                case 'sendEmailForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, sendingEmail: true } }
                case 'setEmailUpdateCounter':
                    return { ...state, updatingEmail: { ...state.updatingEmail, counter: arg.data } }
            }

        console.warn('in Settings component: invalid operation requested in reducer')
        return { ...state }
    }

    const [state, dispatch] = useReducer<State, [Action]>(reducer, {
        updatingEmail: {
            open: false,
            page: 0,
            mode: ((user?.email !== undefined && user?.phoneNumber !== undefined) || (user?.email === undefined && user?.phoneNumber === undefined)) ? undefined : (user?.email ? 'email' : 'phoneNumber'),
            code: '',
            sendingCode: false,
            codeSentAt: undefined,
            counter: undefined,
            email: '',
            sendingEmail: false,
            submittingCode: false,
        },
        updatingPhoneNumber: { open: false, page: 0 },
        updatingPassword: { open: false, page: 0 },
    })

    useEffect(() => {
        if (state.updatingEmail.sendingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/send-email-code`, { method: 'POST', body: JSON.stringify({ usePhoneNumber: state.updatingEmail.mode === 'phoneNumber' }) })
                .finally(() => dispatch('emailUpdateCodeSent'))
    }, [state.updatingEmail.sendingCode])

    const timeout = useRef<NodeJS.Timeout | undefined>(undefined)
    useEffect(() => {
        if (timeout.current !== undefined)
            clearTimeout(timeout.current)

        if (state.updatingEmail.open)
            timeout.current = setTimeout(() => {
                dispatch({ operation: 'setEmailUpdateCounter', data: 60 - (DateTime.utc().toUnixInteger() - state.updatingEmail.codeSentAt) })
            }, 1000)
    }, [state.updatingEmail.open, state.updatingEmail.codeSentAt])

    useEffect(() => {
        if (state.updatingEmail.submittingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/email-code`, { method: 'POST', body: JSON.stringify({ code: state.updatingEmail.code }) })
                .finally(() => dispatch('emailUpdateCodeSent'))
    }, [state.updatingEmail.submittingCode])

    console.log('Settings', { state, user, loading })

    return (
        <>
            <Stack direction="vertical" stackProps={{ className: 'p-1' }}>
                {
                    loading
                        ? <Stack stackProps={{ className: 'w-full justify-center border rounded-lg py-4' }}><CircularLoading /></Stack>
                        : (
                            user
                                ? <ManageUser
                                    user={user}
                                />
                                : <div className='w-full text-center text-5xl border rounded-2xl shadow-2xl p-4 bg-surface-container text-surface-foreground'>{t('Settings.DataNotFound')}</div>
                        )
                }

                <Stack>
                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg p-2' }}>
                            <Input disabled value={user?.email} placeholder={t('common.email')} />
                            <Button onClick={() => dispatch('updateEmail')}>{t('Settings.updateEmail')}</Button>
                        </Stack>

                        <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lgs p-2' }}>
                            <Input disabled value={user?.phoneNumber} placeholder={t('common.phoneNumber')} />
                            <Button onClick={() => dispatch('updatePhoneNumber')}>{t('Settings.updatePhoneNumber')}</Button>
                        </Stack>
                    </Stack>

                    <Separator orientation="vertical" />

                    <Stack direction="vertical" stackProps={{ className: 'w-1/2' }}>
                        <Button onClick={() => dispatch('updatePassword')}>{t('Settings.updatePassword')}</Button>
                    </Stack>
                </Stack>
            </Stack>

            <Modal
                open={state.updatingEmail.open}
                onClose={() => dispatch('updatingEmailClose')}
            >
                <div className="relative w-full h-72 flex-grow overflow-x-hidden overflow-y-auto">
                    <AnimatePresence>
                        {state.updatingEmail.page === 0 &&
                            <motion.div
                                key={state.updatingEmail.page}
                                initial={{ x: '-100%', opacity: 0 }}
                                animate={{ x: '0%', opacity: 1 }}
                                exit={{ x: '100%', opacity: 0 }}
                                className="absolute top-0 size-full"
                            >
                                <Stack direction="vertical">
                                    <div className="text-center text-4xl">
                                        {t('Settings.updateEmailTitle')}
                                    </div>

                                    {user?.phoneNumber && user?.email &&
                                        <Select
                                            inputProps={{
                                                value: state.updatingEmail.mode
                                            }}
                                            onValueSelect={e => dispatch({ operation: 'setModeForEmailUpdate', data: e })}
                                        >
                                            <Select.Item value="email">
                                                {t('common.email')}
                                            </Select.Item>
                                            <Select.Item value="phoneNumber">
                                                {t('common.phoneNumber')}
                                            </Select.Item>
                                        </Select>
                                    }

                                    <Button disabled={state.updatingEmail.mode === undefined || DateTime.utc().minus({ seconds: 60 }).toUnixInteger() < state.updatingEmail.codeSentAt} onClick={() => dispatch({ operation: 'sendCodeForEmailUpdate' })}>{state.updatingEmail.sendingCode ? <CircularLoading /> : t('Settings.sendCode')}</Button>

                                    {
                                        state.updatingEmail.sendingCode
                                            ? <CircularLoading />
                                            : <Input value={state.updatingEmail.code ?? ''} placeholder={t('common.code')} onChange={e => dispatch({ operation: 'setCodeForEmailUpdate', data: e.target.value.trim() })} />
                                    }

                                    <Button disabled={state.updatingEmail.submittingCode} onClick={() => dispatch('submitCodeForEmailUpdate')}>{state.updatingEmail.sendingCode ? <CircularLoading /> : t('common.submit')}</Button>
                                </Stack>
                            </motion.div>
                        }
                    </AnimatePresence>
                </div>
            </Modal>
        </>
    )
}
