import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { t } from "i18next";
import { DateTime } from "luxon";
import { ActionDispatch, useContext, useEffect, useReducer } from "react"

type State = {
    code: string
    sendingCode: boolean
    codeSent: boolean
    codeSentAt: number | undefined
    submittingCode: boolean
    submittedCode: boolean
    confirmCode: string
    sendingConfirmCode: boolean
    sentConfirmCode: boolean
}

type Action =
    'sendCode' |
    'sentCode' |
    'failedToSendCode' |
    'submitCode' |
    'submittedCode' |
    'failedToSubmitCode' |
    'sendConfirmCode' |
    'sentConfirmCode' |
    'failedToSendConfirmCode' |
    { op: 'setConfirmCode', value: string } |
    { op: 'setMode', value: 'email' | 'phoneNumber' } |
    { op: 'setCode', value: string }

function useCode(sendTo: 'email' | 'phoneNumber', mode: 'delete', updateField?: 'email' | 'phoneNumber'): { state: State, dispatch: ActionDispatch<[Action]> }
function useCode(sendTo: 'email' | 'phoneNumber', mode: 'update', updateField: 'email' | 'phoneNumber' | 'password' | 'username'): { state: State, dispatch: ActionDispatch<[Action]> }
function useCode(sendTo: 'email' | 'phoneNumber', mode: 'update' | 'delete', field: 'email' | 'phoneNumber' | 'password' | 'username'): { state: State, dispatch: ActionDispatch<[Action]> } {
    const feedback = useContext(FeedbackContext)

    const [state, dispatch] = useReducer<State, [Action]>((state, action) => {
        if (typeof action === 'string')
            switch (action) {
                case 'sendCode':
                    return { ...state, sendingCode: true }

                case 'sentCode':
                    return { ...state, sendingCode: false, codeSent: true, codeSentAt: DateTime.utc().toUnixInteger() }

                case 'failedToSendCode':
                    return { ...state, sendingCode: false }

                case 'failedToSubmitCode':
                    return { ...state, sendingCode: false }

                case 'submitCode':
                    return { ...state, submittingCode: true }

                case 'submittedCode':
                    return { ...state, submittingCode: false, submittedCode: true }

                case 'failedToSubmitCode':
                    return { ...state, submittingCode: false }

                case 'sendConfirmCode':
                    return { ...state, sendingConfirmCode: true }

                case 'sentConfirmCode':
                    return { ...state, sendingConfirmCode: false, sentConfirmCode: true }

                case 'failedToSendConfirmCode':
                    return { ...state, sendingConfirmCode: false }
            }
        else
            switch (action.op) {
                case 'setCode':
                    return { ...state, code: action.value }

                case 'setConfirmCode':
                    return { ...state, confirmCode: action.value }

                case 'setMode':
                    return { ...state, mode: action.value }
            }
    },
        {
            code: '',
            codeSentAt: undefined,
            sendingCode: false,
            submittingCode: false,
            submittedCode: false,
            codeSent: false,
            confirmCode: '',
            sendingConfirmCode: false,
            sentConfirmCode: false,
        }
    )

    useEffect(() => {
        if (state?.sendingCode === true) {
            authFetchData(`${getAuthApiUrl()}/me/users/${mode === 'delete' ? 'delete-' : ''}notify-code`, {
                method: 'POST',
                body: JSON.stringify({ usePhoneNumber: sendTo === 'phoneNumber', [mode === 'delete' ? 'deleteField' : 'updateField']: field })
            })
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
    }, [state?.sendingCode])

    useEffect(() => {
        if (state?.submittingCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/${mode === 'delete' ? 'delete-' : ''}code`, { method: 'POST', body: JSON.stringify({ code: Number(state?.code) }) })
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
    }, [state?.submittingCode])

    useEffect(() => {
        if (state?.sendingConfirmCode === true)
            authFetchData(`${getAuthApiUrl()}/me/users/confirm`, { method: 'PATCH', body: JSON.stringify({ code: Number(state?.confirmCode) }) })
                .then(r => {
                    if (!r.response || !r.response.ok) {
                        feedback.pushError({ node: t('useCode.failedToSendConfirmationCodes') })
                        dispatch('failedToSendConfirmCode')
                    } else {
                        feedback.pushSuccess({ node: t('useCode.successfullySentConfirmationCodes') })
                        dispatch('sentConfirmCode')
                    }
                })
                .catch(() => dispatch('failedToSendConfirmCode'))
    }, [state?.sendingConfirmCode])

    return { state, dispatch }
}

export { useCode }
