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
        updatingEmail: { open: boolean, page: number, email: string, sendingEmail: boolean }
        updatingPhoneNumber: { open: boolean, page: number }
        updatingPassword: { open: boolean, page: number }
        mode: 'email' | 'phoneNumber'
        code: string
        sendingCode: boolean
        submittingCode: boolean
        codeSentAt: number | undefined
        counter: number | undefined
    }

    type Action =
        'codeSent' |
        'updateEmail' |
        'updateEmailPreviousPage' |
        'updatePhoneNumber' |
        'updatePassword' |
        'updateEmailClose' |
        'codeSubmitted' |
        'submitCode' |
        { operation: 'setMode', data: 'email' | 'phoneNumber' } |
        { operation: 'setCode', data: string } |
        { operation: 'sendCode' } |
        { operation: 'submitCode' } |
        { operation: 'setEmailForEmailUpdate', data: string } |
        { operation: 'sendEmailForEmailUpdate' } |
        { operation: 'setCounter', data: number }

    const reducer = (state: State, arg: Action): State => {
        if (typeof arg === 'string')
            switch (arg) {
                case 'updateEmail':
                    return { ...state, updatingEmail: { ...state.updatingEmail, open: true, page: 0 } }

                case 'updateEmailPreviousPage':
                    return { ...state, updatingEmail: { ...state.updatingEmail, page: state.updatingEmail.page > 0 ? state.updatingEmail.page - 1 : 0 } }

                case 'updateEmailClose':
                    return { ...state, updatingEmail: { ...state.updatingEmail, open: false } }

                case 'codeSent':
                    return { ...state, sendingCode: false, codeSentAt: DateTime.utc().toUnixInteger() }

                case 'codeSubmitted':
                    return { ...state, submittingCode: false, updatingEmail: { ...state.updatingEmail, page: 1 } }

                case 'updatePhoneNumber':
                    return { ...state, updatingPhoneNumber: { open: true, page: 0 } }

                case 'updatePassword':
                    return { ...state, updatingPassword: { open: true, page: 0 } }
            }
        else
            switch (arg.operation) {
                case 'setMode':
                    return { ...state, mode: arg.data }
                case 'setCode':
                    return { ...state, code: arg.data }
                case 'sendCode':
                    return { ...state, sendingCode: true }
                case 'submitCode':
                    return { ...state, submittingCode: true }
                case 'setEmailForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, email: arg.data } }
                case 'sendEmailForEmailUpdate':
                    return { ...state, updatingEmail: { ...state.updatingEmail, sendingEmail: true } }
                case 'setCounter':
                    return { ...state, counter: arg.data }
            }

        console.warn('in Settings component: invalid operation requested in reducer')
        return { ...state }
    }

    const [state, dispatch] = useReducer<State, [Action]>(reducer, {
        updatingEmail: {
            open: false,
            page: 0,
            email: '',
            sendingEmail: false,
        },
        updatingPhoneNumber: { open: false, page: 0 },
        updatingPassword: { open: false, page: 0 },
        mode: ((user?.email !== undefined && user?.phoneNumber !== undefined) || (user?.email === undefined && user?.phoneNumber === undefined)) ? undefined : (user?.email ? 'email' : 'phoneNumber'),
        code: '',
        codeSentAt: undefined,
        counter: undefined,
        sendingCode: false,
        submittingCode: false,
    })

    useEffect(() => {
        if (state.sendingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/notify-code`, { method: 'POST', body: JSON.stringify({ usePhoneNumber: state.mode === 'phoneNumber' }) })
                .finally(() => dispatch('codeSent'))
    }, [state.sendingCode])

    const timeout = useRef<NodeJS.Timeout | undefined>(undefined)
    useEffect(() => {
        if (timeout.current !== undefined)
            clearTimeout(timeout.current)

        if (state.updatingEmail.open)
            timeout.current = setTimeout(() => {
                dispatch({ operation: 'setCounter', data: 60 - (DateTime.utc().toUnixInteger() - state.codeSentAt) })
            }, 1000)
    }, [state.updatingEmail.open, state.codeSentAt])

    useEffect(() => {
        if (state.submittingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/code`, { method: 'POST', body: JSON.stringify({ code: state.code }) })
                .finally(() => dispatch('codeSent'))
    }, [state.submittingCode])

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
                onClose={() => dispatch('updateEmailClose')}
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
                                                value: state.mode
                                            }}
                                            onValueSelect={e => dispatch({ operation: 'setMode', data: e })}
                                        >
                                            <Select.Item value="email">
                                                {t('common.email')}
                                            </Select.Item>
                                            <Select.Item value="phoneNumber">
                                                {t('common.phoneNumber')}
                                            </Select.Item>
                                        </Select>
                                    }

                                    <Button disabled={state.mode === undefined || DateTime.utc().minus({ seconds: 60 }).toUnixInteger() < state.codeSentAt} onClick={() => dispatch({ operation: 'sendCode' })}>{state.sendingCode ? <CircularLoading /> : t('Settings.sendCode')}</Button>

                                    {
                                        state.sendingCode
                                            ? <CircularLoading />
                                            : <Input value={state.code ?? ''} placeholder={t('common.code')} onChange={e => dispatch({ operation: 'setCode', data: e.target.value.trim() })} />
                                    }

                                    <Button disabled={state.submittingCode} onClick={() => dispatch('submitCode')}>{state.submittingCode ? <CircularLoading /> : t('common.submit')}</Button>
                                </Stack>
                            </motion.div>
                        }
                    </AnimatePresence>
                </div>
            </Modal>
        </>
    )
}
