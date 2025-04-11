import { useEffect, useReducer, useRef, useState } from "react"
import { useCode } from "./useCode"
import { DateTime } from "luxon"

export function UpdateEmail({ mode }: { mode: 'email' | 'phoneNumber' }) {
    const [email, setEmail] = useState()
    const [sendingEmail, setSendingEmail] = useState(false)

    const [counter, setCounter] = useState(undefined)

    const { state, dispatch } = useCode(mode, 'email')

    const timeout = useRef<NodeJS.Timeout | undefined>(undefined)
    useEffect(() => {
        if (timeout.current !== undefined)
            clearInterval(timeout.current)

        if (state.codeSentAt !== undefined) {
            timeout.current = setInterval(() => {
                let c = 60 - (DateTime.utc().toUnixInteger() - state.codeSentAt)
                if (c >= 0)
                    setCounter(c)
                else
                    clearInterval(timeout.current)
            }, 1000)
        }
    }, [state.codeSentAt])

    return (
        <div>UpdateEmail</div>
    )
}

