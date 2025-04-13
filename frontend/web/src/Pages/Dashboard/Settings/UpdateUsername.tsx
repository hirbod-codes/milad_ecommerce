import { authFetchData, fetchData, getAuthApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { t } from "i18next"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useContext, useState, useEffect, useRef } from "react"
import { useCode } from "./useCode"
import { motion, AnimatePresence } from 'framer-motion'
import { Code } from "./Code"
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon"

export function UpdateUsername({ sendTo: initialSendTo, onFinish, selectModes }: { sendTo: 'email' | 'phoneNumber', selectModes: boolean, onFinish?: () => void }) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [username, setUsername] = useState('')
    const [sendingUsername, setSendingUsername] = useState(false)

    const [page, setPage] = useState(0)

    const [sendTo, setSendTo] = useState(initialSendTo)

    const { state, dispatch } = useCode(sendTo, 'update', 'username')

    useEffect(() => {
        if (selectModes !== true)
            dispatch('sendCode')
    }, [])

    useEffect(() => {
        if (state.submittedCode)
            setPage(1)
    }, [state.submittedCode])

    useEffect(() => {
        if (username && sendingUsername === true)
            authFetchData(`${getAuthApiUrl()}/me/users/sensitive`, { method: 'PATCH', body: JSON.stringify({ updateValue: username }) })
                .then(r => {
                    if (!r.response || !r.response.ok) {
                        feedback.pushError({ node: t('UpdateUsername.updateFailed') })
                        dispatch('failedToSendCode')
                    } else {
                        feedback.pushSuccess({ node: t('UpdateUsername.updateSucceeded') })
                        if (onFinish)
                            onFinish()
                    }
                })
                .finally(() => setSendingUsername(false))
    }, [sendingUsername])

    const [usernameExists, setUsernameExists] = useState(false)
    const [searching, setSearching] = useState(false)
    const [invalidUsername, setInvalidUsername] = useState(false)
    const searchUsername = async () => {
        setSearching(true)
        const r = await fetchData(`${getAuthApiUrl()}/users/username-exists?username=${username}`)
        setSearching(false)

        if (!r.response || !r.response?.ok || r?.data?.exists === undefined)
            setUsernameExists(false)
        else
            setUsernameExists(Boolean(r?.data?.exists))


        if (r?.response?.status === 400)
            setInvalidUsername(true)
    }

    const timer = useRef(undefined)
    useEffect(() => {
        setUsernameExists(true)

        if (timer.current !== undefined)
            clearTimeout(timer.current)

        if (username)
            timer.current = setTimeout(() => {
                searchUsername()
            }, 1500)
    }, [username])

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
                            <Input
                                endIcon={searching ? <CircularLoading size='sm' /> : undefined}
                                placeholder={t('UpdateUsername.username')}
                                value={username}
                                onChange={e => setUsername(e.target.value.trim())}
                                helperText={!searching && !usernameExists ? t('UpdateUsername.usernameAvailable') : undefined}
                                errorText={!searching && (invalidUsername || usernameExists) ? (invalidUsername ? t('UpdateUsername.invalidUsername') : t('UpdateUsername.usernameAlreadyExists')) : undefined}
                                animateHeight
                            />
                            <Button disabled={sendingUsername || !state.submittedCode || searching || !username || usernameExists} onClick={() => setSendingUsername(true)} >{sendingUsername ? <CircularLoading /> : t('common.submit')}</Button>
                        </Stack>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}
