import { RefObject, useContext, useEffect, useRef, useState } from "react";
import { Button } from "../../Base/Button";
import { Stack } from "../../Base/Stack";
import { Input } from "../../Base/Input";
import { t } from "i18next";
import { EyeIcon, MoveLeftIcon, MoveRightIcon } from "lucide-react";
import { CheckBox } from "../../Base/CheckBox";
import { motion, AnimatePresence } from 'framer-motion'

import { number, string } from "yup";
import { CircularLoadingIcon } from "../../Base/CircularLoadingIcon";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { EmailAuthenticationManager } from "@/src/Backend/Auth/EmailAuthenticationManager";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";

export function EmailSignup({ goToLogin, done }: { goToLogin?: () => void, done?: () => void }) {
    const configuration = useContext(ConfigurationContext)!

    const feedbackPush = useContext(FeedbackContext)!.push

    const [page, setPage] = useState<number>(0)

    const [isPasswordFieldTypeText, setIsPasswordFieldTypeText] = useState<boolean>(false)

    const [hasConsent, setHasConsent] = useState<boolean>(false)

    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [confirmPassword, setConfirmPassword] = useState<string>('')
    const [code, setCode] = useState<string>('')

    const [counter, setCounter] = useState<number>(60)

    const isEmailValid = (str: string) => string().required().email().isValidSync(str.trim())
    const isPasswordValid = (str: string) => string().required().min(8).matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/).isValidSync(str.trim())
    const isCodeValid = (str: string) => string().required().matches(/^[0-9]*$/).isValidSync(str.trim())

    const [loading, setLoading] = useState<boolean>(false)

    const submit = async () => {
        if (!isPasswordValid(password) || !isEmailValid(email))
            return

        if (page === 0)
            await sendCode()
        else {
            if (!isCodeValid(code))
                return

            let c = Number(code)

            let scheme = number().required().integer().min(1)
            if (!scheme.isValidSync(c) || !Number.isFinite(c)) {
                setLoading(false)
                return
            }

            setLoading(true)
            let r = await EmailAuthenticationManager.register(email, password, scheme.cast(c))
            setLoading(false)

            if (r.success) {
                if (done)
                    done()
            } else
                feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendCodeResponseError') })
        }
    }

    const sendCode = async () => {
        setLoading(true)
        let r = await EmailAuthenticationManager.sendCodeToEmail(email)
        setLoading(false)

        if (r.success) {
            setCounter(60)
            setPage(1)
        } else
            feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendSmsResponseError') })
    }

    const int: RefObject<NodeJS.Timeout | undefined> = useRef<NodeJS.Timeout | undefined>(undefined)

    useEffect(() => {
        if (page === 1) {
            if (int.current)
                clearInterval(int.current)
            int.current = setInterval(() => {
                console.log('counter', counter)
                if (counter > 0)
                    setCounter(counter - 1)
                else if (int !== undefined)
                    clearInterval(int.current)
            }, 1000)
        }

        return () => { if (int.current) clearInterval(int.current) }
    }, [page, counter])

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
                        {t('authModal.signupQuestion')}
                        <div className='ml-1 text-sm text-primary hover:cursor-pointer inline hover:underline' onClick={() => { if (goToLogin) goToLogin() }}>
                            {t('authModal.signupQuestionAnswer')}
                        </div>
                    </div>

                    <Stack direction='vertical' stackProps={{ className: 'pt-8' }}>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value.trim())}
                            required
                            type='text'
                            errorText={email !== '' && !isEmailValid(email) ? t('AuthModel.invalidEmail') : undefined}
                            animateHeight
                            placeholder={t("common.email")}
                        />
                        <Input
                            value={password}
                            onChange={(e) => { setPassword(e.target.value.trim()) }}
                            required
                            type={isPasswordFieldTypeText ? 'text' : 'password'}
                            errorText={password !== '' && !isPasswordValid(password) ? t('AuthModel.invalidPassword') : undefined}
                            animateHeight
                            placeholder={t("common.password")}
                            endIcon={<EyeIcon onClick={() => setIsPasswordFieldTypeText(!isPasswordFieldTypeText)} />}
                            endIconProps={{ className: 'cursor-pointer' }}
                        />
                        <Input
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value.trim()) }}
                            required
                            type={isPasswordFieldTypeText ? 'text' : 'password'}
                            errorText={confirmPassword !== '' && confirmPassword !== password ? t('AuthModel.invalidConfirmPassword') : undefined}
                            animateHeight
                            placeholder={t("common.confirmPassword")}
                            endIcon={<EyeIcon onClick={() => setIsPasswordFieldTypeText(!isPasswordFieldTypeText)} />}
                            endIconProps={{ className: 'cursor-pointer' }}
                        />
                        <CheckBox
                            inputProps={{ checked: hasConsent, onChange: (e) => setHasConsent(e.target.checked), className: hasConsent ? undefined : 'border border-error' }}
                            label={<><div className="text-xs inline">{t('authModal.consent')}</div><div className="ml-1 inline hover:underline text-primary text-xs">{t('authModal.consentLink')}</div></>}
                            labelFirst={false}
                            rippleEffect={true}
                        />

                        <Button disabled={loading || !hasConsent || isPasswordValid(password) === false || confirmPassword !== password || isEmailValid(email) === false} onClick={submit}>{loading ? <CircularLoadingIcon /> : t('common.next')}</Button>
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
                    <Stack direction='vertical' stackProps={{ className: 'py-4' }}>
                        <Button variant='text' isIcon onClick={() => setPage(0)}>{configuration.local.direction === 'ltr' ? <MoveLeftIcon /> : <MoveRightIcon />}</Button>

                        <div className={`text-3xl text-center ${counter > 0 ? '' : 'text-error'}`}>
                            {counter}
                        </div>

                        <Input
                            value={code}
                            onChange={(e) => { setCode(e.target.value.trim()) }}
                            required
                            type='text'
                            errorText={code !== '' && !isCodeValid(code) ? t('Signup.invalidCode') : undefined}
                            animateHeight
                            placeholder={t("common.code")}
                        />

                        <Button disabled={loading || counter > 0} onClick={async () => await sendCode()}>{loading ? <CircularLoadingIcon /> : t('common.resend')}</Button>

                        <Button disabled={loading || isCodeValid(code) === false} onClick={submit}>{loading ? <CircularLoadingIcon /> : t('common.signup')}</Button>
                    </Stack>
                </motion.div>
            }
        </AnimatePresence >
    )
}
