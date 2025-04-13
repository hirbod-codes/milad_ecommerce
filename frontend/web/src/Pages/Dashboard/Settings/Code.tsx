import { ActionDispatch } from "react";
import { useEffect, useRef, useState } from "react";
import { t } from "i18next"
import { motion } from 'framer-motion'
import { Stack } from "@/src/Components/Base/Stack"
import { Input } from "@/src/Components/Base/Input"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Select } from "@/src/Components/Base/Select"
import { DateTime } from "luxon";
import { Action, State } from "./useCode";

export type CodeProps = {
    state: State
    dispatch: ActionDispatch<[Action]>
    sendTo: 'email' | 'phoneNumber'
    setSendTo: (sendTo: 'email' | 'phoneNumber') => void
    selectModes: boolean
    onFinish?: () => void
    title?: string
}

export function Code({ state, dispatch, sendTo, setSendTo, onFinish, selectModes, title }: CodeProps) {
    const [counter, setCounter] = useState(undefined)

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
        if (state.codeSent)
            if (onFinish)
                onFinish()
    }, [state.codeSent])

    return (
        <Stack direction="vertical">
            <div className="text-center text-4xl">
                {title}
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

            <Button disabled={sendTo === undefined || DateTime.utc().minus({ seconds: 60 }).toUnixInteger() < state.codeSentAt} onClick={() => dispatch('sendCode')}>
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

            {state.codeSentAt !== undefined && <motion.div layout className="text-center text-2xl">{counter}</motion.div>}

            <Button disabled={state.code.match(/^[0-9]+$/) === null || !state.codeSent || state.submittingCode || counter <= 0} onClick={() => dispatch('submitCode')}>
                {state.submittingCode ? <CircularLoading /> : t('common.submit')}
            </Button>
        </Stack>
    )
}

