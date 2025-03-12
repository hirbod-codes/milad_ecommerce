import { RefObject, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Stack } from "../../Base/Stack";
import { string } from "yup";
import { Input } from "../../Base/Input";
import { CheckBox } from "../../Base/CheckBox";
import { Button } from "../../Base/Button";
import { t } from "i18next";
import { CircularLoadingIcon } from "../../Base/CircularLoadingIcon";
import { SmsAuthenticationManager } from "@/src/Backend/Auth/SmsAuthenticationManager";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { motion, AnimatePresence } from 'framer-motion'
import { MoveLeftIcon, MoveRightIcon } from "lucide-react";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";

export function SmsAuth({ done }: { done?: () => void }) {
    const configuration = useContext(ConfigurationContext)!

    const feedbackPush = useContext(FeedbackContext)!.push

    const [page, setPage] = useState<number>(0)

    const [hasConsent, setHasConsent] = useState<boolean>(false)

    const [phoneNumber, setPhoneNumber] = useState<string>('')
    const [code, setCode] = useState<string>('')

    const [counter, setCounter] = useState<number>(60)

    const isPhoneNumberValid = (str: string) => string().required().matches(/^[0-9]{11}$/).isValidSync(str.trim())
    const isCodeValid = (str: string) => string().required().matches(/^[0-9]*$/).isValidSync(str.trim())

    const [loading, setLoading] = useState<boolean>(false)

    const submit = async () => {
        if (!isPhoneNumberValid(phoneNumber))
            return

        if (page === 0)
            await sendCode()
        else {
            if (!isCodeValid(code))
                return

            setLoading(true)

            let c
            try { c = parseInt(code) }
            catch (e) { }

            if (c === undefined || Number.isNaN(c) || Math.abs(c) === Infinity) {
                setLoading(false)
                return
            }

            let r = await SmsAuthenticationManager.submit(c, phoneNumber)

            if (r.success) {
                if (done)
                    done()
            } else
                feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendCodeResponseError') })
        }
    }

    const sendCode = async () => {
        setLoading(true)
        let r = await SmsAuthenticationManager.sendSms(phoneNumber)
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
        <div className="relative size-full overflow-x-hidden overflow-y-auto">
            <AnimatePresence>
                {page === 0 &&
                    <motion.div
                        key={page}
                        initial={{ x: '-100%', opacity: 0 }}
                        animate={{ x: '0%', opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        className="absolute top-0 size-full"
                    >
                        <Stack direction='vertical' stackProps={{ className: 'size-full justify-between py-4' }}>
                            <Stack direction='vertical' stackProps={{ className: '' }}>
                                <Input
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                    type='text'
                                    errorText={phoneNumber !== '' && !isPhoneNumberValid(phoneNumber) ? t('SmsAuth.invalidPhoneNumber') : undefined}
                                    animateHeight
                                    placeholder={t("common.phoneNumber")}
                                />
                                <CheckBox
                                    inputProps={{ checked: hasConsent, onChange: (e) => setHasConsent(e.target.checked), className: hasConsent ? undefined : 'border border-error' }}
                                    label={<><div className="text-xs inline">{t('SmsAuth.consent')}</div><div className="ml-1 inline hover:underline text-primary text-xs">{t('SmsAuth.consentLink')}</div></>}
                                    labelFirst={false}
                                    rippleEffect={true}
                                />
                            </Stack>

                            <Button disabled={loading || !hasConsent} onClick={submit}>{loading ? <CircularLoadingIcon /> : t('SmsAuth.sendCode')}</Button>
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
                                onChange={(e) => setCode(e.target.value)}
                                required
                                type='text'
                                errorText={code !== '' && !isCodeValid(code) ? t('SmsAuth.invalidCode') : undefined}
                                animateHeight
                                placeholder={t("common.code")}
                            />

                            <Button disabled={loading || counter > 0} onClick={async () => await sendCode()}>{loading ? <CircularLoadingIcon /> : t('common.resend')}</Button>

                            <Button disabled={loading} onClick={submit}>{loading ? <CircularLoadingIcon /> : `${t('common.login')}/${t('common.signup')}`}</Button>
                        </Stack>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}
