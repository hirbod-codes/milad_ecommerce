import { useContext, useEffect, useState } from "react"
import { useCode } from "./useCode"
import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { t } from "i18next"
import { motion, AnimatePresence } from 'framer-motion'
import { Stack } from "@/src/Components/Base/Stack"
import { Input } from "@/src/Components/Base/Input"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"
import { Code } from "./Code"

export function UpdatePhoneNumber({ sendTo: initialSendTo, onFinish, selectModes }: { sendTo: 'email' | 'phoneNumber', selectModes: boolean, onFinish?: () => void }) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [phoneNumber, setPhoneNumber] = useState('')
    const [sendingPhoneNumber, setSendingPhoneNumber] = useState(false)

    const [page, setPage] = useState(0)

    const [sendTo, setSendTo] = useState(initialSendTo)

    const { state, dispatch } = useCode(sendTo, 'update', 'phoneNumber')

    useEffect(() => {
        if (selectModes !== true)
            dispatch('sendCode')
    }, [])

    useEffect(() => {
        if (state.submittedCode)
            setPage(1)
    }, [state.submittedCode])

    useEffect(() => {
        if (phoneNumber && sendingPhoneNumber === true)
            authFetchData(`${getAuthApiUrl()}/me/users/sensitive`, { method: 'PATCH', body: JSON.stringify({ updateValue: phoneNumber }) })
                .then(r => {
                    if (!r.response || !r.response.ok) {
                        feedback.pushError({ node: t('UpdateEmail.updateFailed') })
                        dispatch('failedToSendCode')
                    } else {
                        feedback.pushSuccess({ node: t('UpdateEmail.updateSucceeded') })
                        setPage(2)
                    }
                })
                .finally(() => setSendingPhoneNumber(false))
    }, [sendingPhoneNumber])

    useEffect(() => {
        if (state.sentConfirmCode)
            if (onFinish)
                onFinish()
    }, [state.sentConfirmCode])

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
                            title={t('Settings.updatePhoneNumberTitle')}
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
                            <Input placeholder={t('UpdateEmail.newEmail')} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.trim())} />
                            <Button disabled={sendingPhoneNumber || !state.submittedCode} onClick={() => setSendingPhoneNumber(true)} >{sendingPhoneNumber ? <CircularLoading /> : t('Settings.submit')}</Button>
                        </Stack>
                    </motion.div>
                }

                {page === 2 &&
                    <motion.div
                        key={page}
                        initial={{ x: '-100%', opacity: 0 }}
                        animate={{ x: '0%', opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        className="absolute top-0 size-full"
                    >
                        <Button isIcon variant="text" onClick={() => setPage(1)}>{configuration.local.direction === 'ltr' ? <ArrowLeftIcon /> : <ArrowRightIcon />}</Button>

                        <Stack direction="vertical">
                            <Input placeholder={t('UpdateEmail.confirmationCode')} value={state.confirmCode} onChange={e => dispatch({ op: 'setConfirmCode', value: e.target.value.trim() })} />
                            <Button disabled={state.sentConfirmCode || state.sendingConfirmCode} onClick={() => dispatch('sendConfirmCode')} >{state.sendingConfirmCode ? <CircularLoading /> : t('Settings.submit')}</Button>
                        </Stack>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}
