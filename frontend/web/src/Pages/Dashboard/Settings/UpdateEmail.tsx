import { useContext, useEffect, useReducer, useRef, useState } from "react"
import { useCode } from "./useCode"
import { DateTime } from "luxon"
import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { t } from "i18next"
import { motion, AnimatePresence } from 'framer-motion'
import { Stack } from "@/src/Components/Base/Stack"
import { Input } from "@/src/Components/Base/Input"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Select } from "@/src/Components/Base/Select"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"

export function UpdateEmail({ mode: initialMode, onFinish, selectModes }: { mode: 'email' | 'phoneNumber', selectModes: boolean, onFinish?: () => void }) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [email, setEmail] = useState('')
    const [sendingEmail, setSendingEmail] = useState(false)

    const [page, setPage] = useState(0)

    const [mode, setMode] = useState(initialMode)

    const [counter, setCounter] = useState(undefined)

    const { state, dispatch } = useCode(mode, 'email')

    const timeout = useRef<NodeJS.Timeout | undefined>(undefined)
    useEffect(() => {
        if (timeout.current !== undefined)
            clearInterval(timeout.current)

        if (state.codeSent && state.codeSentAt !== undefined) {
            timeout.current = setInterval(() => {
                let c = 60 - (DateTime.utc().toUnixInteger() - state.codeSentAt)
                if (c >= 0)
                    setCounter(c)
                else
                    clearInterval(timeout.current)
            }, 1000)
        }

        return () => { if (timeout.current !== undefined) clearInterval(timeout.current) }
    }, [state.codeSent, state.codeSentAt])

    useEffect(() => {
        if (state.submittedCode)
            setPage(1)
    }, [state.submittedCode])

    useEffect(() => {
        if (email && sendingEmail === true)
            authFetchData(`${getAuthApiUrl()}/me/users/sensitive`, { method: 'PATCH', body: JSON.stringify({ updateValue: email }) })
                .then(r => {
                    if (!r.response || !r.response.ok)
                        feedback.pushError({ node: t('UpdateEmail.updateFailed') })
                    else
                        feedback.pushSuccess({ node: t('UpdateEmail.updateSucceeded') })

                    if (onFinish)
                        onFinish()
                })
                .finally(() => setSendingEmail(false))
    }, [sendingEmail])

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
                        <Stack direction="vertical">
                            <div className="text-center text-4xl">
                                {t('Settings.updateEmailTitle')}
                            </div>

                            {selectModes &&
                                <Select
                                    inputProps={{
                                        value: mode
                                    }}
                                    onValueSelect={e => setMode(e)}
                                >
                                    <Select.Item value="email">
                                        {t('common.email')}
                                    </Select.Item>
                                    <Select.Item value="phoneNumber">
                                        {t('common.phoneNumber')}
                                    </Select.Item>
                                </Select>
                            }

                            <Button disabled={mode === undefined || DateTime.utc().minus({ seconds: 60 }).toUnixInteger() < state.codeSentAt} onClick={() => dispatch('sendCode')}>
                                {state.sendingCode ? <CircularLoading /> : t('Settings.sendCode')}
                            </Button>

                            {
                                state.sendingCode
                                    ? <CircularLoading />
                                    : <Input
                                        errorText={state.code && state.code.match(/^[0-9]+$/) === null ? t('Settings.invalidCode') : undefined}
                                        animateHeight
                                        value={state.code ?? ''}
                                        placeholder={t('common.code')}
                                        onChange={e => dispatch({ op: 'setCode', value: e.target.value.trim() })}
                                    />
                            }

                            {state.codeSentAt !== undefined && <motion.div layout className="text-center text -2xl">{counter}</motion.div>}

                            <Button disabled={state.code.match(/^[0-9]+$/) === null || !state.codeSent || state.submittingCode || counter <= 0} onClick={() => dispatch('submitCode')}>
                                {state.submittingCode ? <CircularLoading /> : t('common.submit')}
                            </Button>
                        </Stack>
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
                        <Button isIcon variant="text" onClick={() => setPage(1)}>{configuration.local.direction === 'ltr' ? <ArrowLeftIcon /> : <ArrowRightIcon />}</Button>

                        <Stack direction="vertical">
                            <Input placeholder={t('newEmail')} value={email} onChange={e => setEmail(e.target.value.trim())} />
                            <Button disabled={sendingEmail || !state.submittedCode} onClick={() => setSendingEmail(true)} >{t('Settings.submit')}</Button>
                        </Stack>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}
