import { useContext, useState } from "react";
import { Button } from "../../Base/Button";
import { Stack } from "../../Base/Stack";
import { Input } from "../../Base/Input";
import { t } from "i18next";
import { EyeIcon } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion'

import { number, string } from "yup";
import { CircularLoadingIcon } from "../../Base/CircularLoadingIcon";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { useNavigate } from "react-router";
import { EmailAuthenticationManager } from "@/src/Backend/Auth/EmailAuthenticationManager";

export function EmailLogin({ goToSignup }: { goToSignup?: () => void }) {
    const navigate = useNavigate()

    const feedbackPush = useContext(FeedbackContext)!.push

    const [page, setPage] = useState<number>(0)

    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [code, setCode] = useState<string>('')

    const [isPasswordFieldTypeText, setIsPasswordFieldTypeText] = useState<boolean>(false)

    const isEmailValid = (str: string) => string().required().email().isValidSync(str.trim())
    const isPasswordValid = (str: string) => string().required().min(8).matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/).isValidSync(str.trim())
    const isCodeValid = (str: string) => string().required().matches(/^[0-9]*$/).isValidSync(str.trim())

    const [loading, setLoading] = useState<boolean>(false)

    const submit = async () => {
        if (!isPasswordValid(password) || !isEmailValid(email))
            return

        if (page === 0) {
            setLoading(true)

            let r = await EmailAuthenticationManager.sendCodeToEmail(email)

            setPage(1)
            if (r.success)
                setPage(1)
            else
                feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendSmsResponseError') })

            setLoading(false)
        } else {
            if (!isCodeValid(code))
                return

            setLoading(true)

            let c = Number(code)

            let scheme = number().required().integer().min(1)
            if (!scheme.isValidSync(c) || !Number.isFinite(c)) {
                setLoading(false)
                return
            }

            let r = await EmailAuthenticationManager.authenticate(email, password, scheme.cast(c))

            if (r.success)
                navigate(-1)
            else
                feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendCodeResponseError') })
        }
    }

    return (
        <AnimatePresence>
            {page === 0 &&
                <motion.div
                    key={page}
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: '0%', opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    className="absolute top-0 size-full"
                >
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
                            errorText={isEmailValid(email) ? t('Login.invalidEmail') : undefined}
                            animateHeight
                            placeholder={t("common.email")}
                        />
                        <Input
                            value={password}
                            onChange={(e) => { setPassword(e.target.value.trim()) }}
                            required
                            type={isPasswordFieldTypeText ? 'text' : 'password'}
                            errorText={isPasswordValid(password) ? t('Login.invalidPassword') : undefined}
                            animateHeight
                            placeholder={t("common.password")}
                            endIcon={<EyeIcon onClick={() => setIsPasswordFieldTypeText(!isPasswordFieldTypeText)} />}
                            endIconProps={{ className: 'cursor-pointer' }}
                        />

                        <Button disabled={loading} onClick={submit}>{loading ? <CircularLoadingIcon /> : t('common.next')}</Button>
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
                    <Stack direction='vertical' size={3} stackProps={{ className: 'justify-between' }}>
                        <Input
                            value={code}
                            onChange={(e) => { setCode(e.target.value.trim()) }}
                            required
                            type='text'
                            errorText={isCodeValid(code) ? t('Login.invalidCode') : undefined}
                            animateHeight
                            placeholder={t("common.code")}
                        />

                        <Button disabled={loading} onClick={submit}>{loading ? <CircularLoadingIcon /> : t('common.login')}</Button>
                    </Stack>
                </motion.div>
            }
        </AnimatePresence>
    )
}
