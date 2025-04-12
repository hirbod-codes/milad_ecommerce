import { useContext, useEffect, useRef, useState } from "react";
import { useCode } from "./useCode";
import { t } from "i18next"
import { motion } from 'framer-motion'
import { Stack } from "@/src/Components/Base/Stack"
import { Input } from "@/src/Components/Base/Input"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Select } from "@/src/Components/Base/Select"
import { DateTime } from "luxon";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"

export function DeleteEmail({ sendTo: sendToInit, onFinish, selectModes }: { sendTo: 'email' | 'phoneNumber', selectModes: boolean, onFinish?: () => void }) {
    const feedback = useContext(FeedbackContext)

    const [counter, setCounter] = useState(undefined)

    const [sendTo, setSendTo] = useState(sendToInit)

    const { state: codeState, dispatch: codeDispatch } = useCode(sendTo, 'delete', 'email')

    const timeout = useRef<NodeJS.Timeout | undefined>(undefined)
    useEffect(() => {
        if (timeout.current !== undefined)
            clearInterval(timeout.current)

        if (codeState.codeSent && codeState.codeSentAt !== undefined) {
            timeout.current = setInterval(() => {
                let c = 60 - (DateTime.utc().toUnixInteger() - codeState.codeSentAt)
                if (c >= 0)
                    setCounter(c)
                else
                    clearInterval(timeout.current)
            }, 1000)
        }

        return () => { if (timeout.current !== undefined) clearInterval(timeout.current) }
    }, [codeState.codeSent, codeState.codeSentAt])

    useEffect(() => {
        if (codeState.deleted)
            if (onFinish)
                onFinish()

    }, [codeState.deleted])

    return (
        codeState.deleting
            ? <CircularLoading />
            : <Stack direction="vertical">
                <div className="text-center text-4xl">
                    {t('Settings.updateEmailTitle')}
                </div>

                {selectModes &&
                    <Select
                        inputProps={{
                            value: sendTo
                        }}
                        onValueSelect={e => setSendTo(e)}
                    >
                        <Select.Item value="email">
                            {t('common.email')}
                        </Select.Item>
                        <Select.Item value="phoneNumber">
                            {t('common.phoneNumber')}
                        </Select.Item>
                    </Select>
                }

                <Button disabled={sendTo === undefined || DateTime.utc().minus({ seconds: 60 }).toUnixInteger() < codeState.codeSentAt} onClick={() => codeDispatch('sendCode')}>
                    {codeState.sendingCode ? <CircularLoading /> : t('Settings.sendCode')}
                </Button>

                {
                    codeState.sendingCode
                        ? <CircularLoading />
                        : <Input
                            errorText={codeState.code && codeState.code.match(/^[0-9]+$/) === null ? t('Settings.invalidCode') : undefined}
                            animateHeight
                            value={codeState.code ?? ''}
                            placeholder={t('common.code')}
                            onChange={e => codeDispatch({ op: 'setCode', value: e.target.value.trim() })}
                        />
                }

                {codeState.codeSentAt !== undefined && <motion.div layout className="text-center text -2xl">{counter}</motion.div>}

                <Button disabled={codeState.code.match(/^[0-9]+$/) === null || !codeState.codeSent || codeState.submittingCode || counter <= 0} onClick={() => codeDispatch('submitCode')}>
                    {codeState.submittingCode ? <CircularLoading /> : t('common.submit')}
                </Button>
            </Stack>
    )
}
