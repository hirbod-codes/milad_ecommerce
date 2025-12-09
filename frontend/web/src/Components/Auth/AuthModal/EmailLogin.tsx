import { useContext, useState } from "react";
import { Button } from "../../Base/Button";
import { Stack } from "../../Base/Stack";
import { Input } from "../../Base/Input";
import { t } from "i18next";
import { EyeIcon } from "lucide-react";

import { string } from "yup";
import { CircularLoadingIcon } from "../../Base/CircularLoadingIcon";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { EmailAuthenticationManager } from "@/src/Backend/Auth/EmailAuthenticationManager";

export function EmailLogin({ goToSignup, done }: { goToSignup?: () => void, done?: () => void }) {
    const feedbackPush = useContext(FeedbackContext)!.push

    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')

    const [isPasswordFieldTypeText, setIsPasswordFieldTypeText] = useState<boolean>(false)

    const isEmailValid = (str: string) => string().required().email().isValidSync(str.trim())
    const isPasswordValid = (str: string) => string().required().min(8).matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/).isValidSync(str.trim())

    const [loading, setLoading] = useState<boolean>(false)

    const submit = async () => {
        // if (!isPasswordValid(password) || !isEmailValid(email))
        //     return

        setLoading(true)

        let r = await EmailAuthenticationManager.authenticate(email, password)

        setLoading(false)

        if (r.success) {
            if (done)
                done()
        } else
            feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendCodeResponseError') })
    }

    return (
        <>
            <div className='pt-2 text-start text-sm'>
                {t('authModal.loginQuestion')}
                <div className='ml-1 text-sm text-primary hover:cursor-pointer inline hover:underline' onClick={() => { if (goToSignup) goToSignup() }}>
                    {t('authModal.loginQuestionAnswer')}
                </div>
            </div>

            <Stack direction='vertical' size={3} stackProps={{ className: 'pt-12' }}>
                <Input
                    value={email}
                    onChange={(e) => { setEmail(e.target.value.trim()) }}
                    required
                    type='text'
                    errorText={email !== '' && !isEmailValid(email) ? t('Login.invalidEmail') : undefined}
                    animateHeight
                    placeholder={t("common.email")}
                />
                <Input
                    value={password}
                    onChange={(e) => { setPassword(e.target.value.trim()) }}
                    required
                    type={isPasswordFieldTypeText ? 'text' : 'password'}
                    errorText={password !== '' && !isPasswordValid(password) ? t('Login.invalidPassword') : undefined}
                    animateHeight
                    placeholder={t("common.password")}
                    endIcon={<EyeIcon onClick={() => setIsPasswordFieldTypeText(!isPasswordFieldTypeText)} />}
                    endIconProps={{ className: 'cursor-pointer' }}
                />

                <Button
                    // disabled={loading || isPasswordValid(password) === false || isEmailValid(email) === false}
                    onClick={submit}
                >
                    {loading ? <CircularLoadingIcon /> : t('common.next')}
                </Button>
            </Stack>
        </>
    )
}
