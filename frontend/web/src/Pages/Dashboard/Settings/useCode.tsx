import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { DateTime } from "luxon";
import { useEffect, useReducer } from "react"

export function useCode(mode: 'email' | 'phoneNumber', updateField: 'email' | 'phoneNumber' | 'password' | 'username' | 'delete') {
    type State = {
        code: string
        sendingCode: boolean
        submittingCode: boolean
        codeSentAt: number | undefined
        codeSent: boolean
    }

    type Action =
        'sendCode' |
        'sentCode' |
        'submitCode' |
        'submittedCode' |
        { op: 'setMode', value: 'email' | 'phoneNumber' } |
        { op: 'setCode', value: string }

    const [state, dispatch] = useReducer<State, [Action]>((state, action) => {
        let act
        if (typeof action === 'string')
            act = { op: action }
        else
            act = action

        switch (act.op) {
            case 'sendCode':
                return { ...state, sendingCode: true }

            case 'sentCode':
                return { ...state, sendingCode: false, codeSent: true, codeSentAt: DateTime.utc().toUnixInteger() }

            case 'submitCode':
                return { ...state, submittingCode: true }

            case 'submittedCode':
                return { ...state, submittingCode: false }

            case 'setMode':
                return { ...state, mode: act.value }

            case 'setCode':
                return { ...state, code: act.value }
        }
    },
        {
            code: '',
            codeSentAt: undefined,
            sendingCode: false,
            submittingCode: false,
            codeSent: false,
        }
    )

    useEffect(() => {
        if (state.sendingCode === true) {
            authFetchData(`${getAuthApiUrl()}/me/users/notify-code`, { method: 'POST', body: JSON.stringify({ usePhoneNumber: mode === 'phoneNumber', updateField }) })
                .finally(() => dispatch('sentCode'))
        }
    }, [state.sendingCode])

    useEffect(() => {
        if (state.submittingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/code`, { method: 'POST', body: JSON.stringify({ code: Number(state.code) }) })
                .finally(() => dispatch('submittedCode'))
    }, [state.submittingCode])

    return { state, dispatch }
}
