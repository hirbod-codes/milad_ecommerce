import { useEffect, useState } from "react";
import { useCode } from "./useCode";
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Code } from "./Code";
import { t } from "i18next";

export function DeletePhoneNumber({ sendTo: sendToInit, onFinish, selectModes }: { sendTo: 'email' | 'phoneNumber', selectModes: boolean, onFinish?: () => void }) {
    const [sendTo, setSendTo] = useState(sendToInit)

    const { state: codeState, dispatch: codeDispatch } = useCode(sendTo, 'delete', 'phoneNumber')

    useEffect(() => {
        if (codeState.deleted)
            if (onFinish)
                onFinish()

    }, [codeState.deleted])

    return (
        codeState.deleting
            ? <CircularLoading />
            : <Code
                sendTo={sendTo}
                setSendTo={setSendTo}
                selectModes={selectModes}
                state={codeState}
                dispatch={codeDispatch}
                title={t('Settings.updatePhoneNumberTitle')}
            />
    )
}
