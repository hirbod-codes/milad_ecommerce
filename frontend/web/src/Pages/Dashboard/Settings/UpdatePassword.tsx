import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { t } from "i18next"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useContext, useState, useEffect } from "react"
import { useCode } from "./useCode"
import { motion, AnimatePresence } from 'framer-motion'
import { Code } from "./Code"

export function UpdatePassword({ sendTo: initialSendTo, onFinish, selectModes }: { sendTo: 'email' | 'phoneNumber', selectModes: boolean, onFinish?: () => void }) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [sendingPassword, setSendingPassword] = useState(false)

    const [page, setPage] = useState(0)

    const [sendTo, setSendTo] = useState(initialSendTo)

    const { state, dispatch } = useCode(sendTo, 'update', 'password')

    useEffect(() => {
        if (selectModes !== true)
            dispatch('sendCode')
    }, [])

    useEffect(() => {
        if (state.submittedCode)
            setPage(1)
    }, [state.submittedCode])

    useEffect(() => {
        if (password && sendingPassword === true)
            authFetchData(`${getAuthApiUrl()}/me/users/sensitive`, { method: 'PATCH', body: JSON.stringify({ updateValue: password }) })
                .then(r => {
                    if (!r.response || !r.response.ok) {
                        feedback.pushError({ node: t('UpdatePassword.updateFailed') })
                        dispatch('failedToSendCode')
                    } else {
                        feedback.pushSuccess({ node: t('UpdatePassword.updateSucceeded') })
                        if (onFinish)
                            onFinish()
                    }
                })
                .finally(() => setSendingPassword(false))
    }, [sendingPassword])

    return (
        <div className="relative w-full h-80 flex-grow overflow-x-hidden overflow-y-auto">
            <AnimatePresence>
                {page === 0 &&
                    <motion.div
                        key={page}
                        initial={{ x: '-100%', opacity: 0 }}
                        animate={{ x: '0%', opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        className="absolute top-0 size-full"
                    >
                        <Code
                            sendTo={sendTo}
                            setSendTo={setSendTo}
                            selectModes={selectModes}
                            state={state}
                            dispatch={dispatch}
                            title={t('Settings.updateEmailTitle')}
                        />
                    </motion.div>
                }

                {page === 1 &&
                    <motion.div
                        key={page}
                        initial={{ x: '-100%', opacity: 0 }}
                        animate={{ x: '0%', opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        className="absolute top-0 size-full"
                    >
                        <Button isIcon variant="text" onClick={() => setPage(0)}>{configuration.local.direction === 'ltr' ? <ArrowLeftIcon /> : <ArrowRightIcon />}</Button>

                        <Stack direction="vertical">
                            <Input placeholder={t('UpdatePassword.password')} value={password} onChange={e => setPassword(e.target.value.trim())} />
                            <Input
                                errorText={password && confirmPassword !== password ? t('UpdatePassword.invalidConfirmPassword') : undefined}
                                animateHeight
                                placeholder={t('UpdatePassword.confirmPassword')}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value.trim())}
                            />
                            <Button disabled={sendingPassword || !state.submittedCode} onClick={() => setSendingPassword(true)} >{sendingPassword ? <CircularLoading /> : t('common.submit')}</Button>
                        </Stack>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}
