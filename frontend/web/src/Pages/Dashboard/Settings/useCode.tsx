import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { t } from "i18next";
import { DateTime } from "luxon";
import { useContext, useEffect, useReducer } from "react"

export function useCode(mode: 'email' | 'phoneNumber', updateField: 'email' | 'phoneNumber' | 'password' | 'username') {
    const feedback = useContext(FeedbackContext)

    type State = {
        code: string
        sendingCode: boolean
        submittingCode: boolean
        submittedCode: boolean
        codeSentAt: number | undefined
        codeSent: boolean
    }

    type Action =
        'sendCode' |
        'sentCode' |
        'failedToSendCode' |
        'submitCode' |
        'submittedCode' |
        'failedToSubmitCode' |
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

            case 'failedToSubmitCode':
                return { ...state, sendingCode: false }

            case 'submitCode':
                return { ...state, submittingCode: true }

            case 'submittedCode':
                return { ...state, submittingCode: false, submittedCode: true }

            case 'failedToSubmitCode':
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
            submittedCode: false,
            codeSent: false,
        }
    )

    useEffect(() => {
        if (state.sendingCode === true) {
            authFetchData(`${getAuthApiUrl()}/me/users/notify-code`, { method: 'POST', body: JSON.stringify({ usePhoneNumber: mode === 'phoneNumber', updateField }) })
                .then(r => {
                    if (!r.response || !r.response.ok) {
                        feedback.pushError({ node: t('useCode.failedToSendVerificationCodes') })
                        dispatch('failedToSendCode')
                    } else {
                        feedback.pushSuccess({ node: t('useCode.successfullySentVerificationCodes') })
                        dispatch('sentCode')
                    }
                })
                .catch(() => dispatch('failedToSendCode'))
        }
    }, [state.sendingCode])

    useEffect(() => {
        if (state.submittingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/code`, { method: 'POST', body: JSON.stringify({ code: Number(state.code) }) })
                .then(r => {
                    if (!r.response || !r.response.ok) {
                        feedback.pushError({ node: t('useCode.failedToSendVerificationCodes') })
                        dispatch('failedToSubmitCode')
                    } else {
                        feedback.pushSuccess({ node: t('useCode.successfullySentVerificationCodes') })
                        dispatch('submittedCode')
                    }
                })
                .catch(() => dispatch('failedToSubmitCode'))
    }, [state.submittingCode])

    return { state, dispatch }
}
