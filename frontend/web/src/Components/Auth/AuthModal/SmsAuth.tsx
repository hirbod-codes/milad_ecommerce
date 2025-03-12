import { useContext, useState } from "react";
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
import { MoveLeftIcon } from "lucide-react";
import { useNavigate } from "react-router";

export function SmsAuth() {
    const navigate = useNavigate()

    const feedbackPush = useContext(FeedbackContext)!.push

    const [page, setPage] = useState<number>(0)

    const [hasConsent, setHasConsent] = useState<boolean>(false)

    const [phoneNumber, setPhoneNumber] = useState<string>('')
    const [code, setCode] = useState<string>('')

    const isPhoneNumberValid = (str: string) => string().required().matches(/^[0-9]{11}$/).isValidSync(str.trim())
    const isCodeValid = (str: string) => string().required().matches(/^[0-9]*$/).isValidSync(str.trim())

    const [loading, setLoading] = useState<boolean>(false)

    const submit = async () => {
        if (page === 0) {
            if (!isPhoneNumberValid(phoneNumber))
                return

            setLoading(true)

            let r = await SmsAuthenticationManager.sendSms(phoneNumber)

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

            let c
            try { c = parseInt(code) }
            catch (e) { }

            if (c === undefined || Number.isNaN(c) || Math.abs(c) === Infinity) {
                setLoading(false)
                return
            }

            let r = await SmsAuthenticationManager.submit(c, phoneNumber)

            if (r.success)
                navigate(-1)
            else
                feedbackPush({ color: { bgColor: 'error-container', fgColor: 'error-container-foreground' }, node: t('SmsAuth.sendCodeResponseError') })
        }
    }

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
                                    inputProps={{ checked: hasConsent, onChange: (e) => setHasConsent(e.target.checked) }}
                                    label={<><div className="text-xs inline">{t('SmsAuth.consent')}</div><div className="ml-1 inline hover:underline text-primary text-xs">{t('SmsAuth.consentLink')}</div></>}
                                    labelFirst={false}
                                    rippleEffect={true}
                                />
                            </Stack>

                            <Button disabled={loading} onClick={submit}>{loading ? <CircularLoadingIcon /> : t('SmsAuth.sendCode')}</Button>
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
                            <Button variant='text' isIcon onClick={() => setPage(0)}><MoveLeftIcon /></Button>

                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                type='text'
                                errorText={code !== '' && !isCodeValid(code) ? t('SmsAuth.invalidCode') : undefined}
                                animateHeight
                                placeholder={t("common.code")}
                            />

                            <Button disabled={loading} onClick={submit}>{loading ? <CircularLoadingIcon /> : `${t('common.login')}/${t('common.signup')}`}</Button>

                        </Stack>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}
