import { useState } from "react";
import { Button } from "../../Base/Button";
import { Stack } from "../../Base/Stack";
import { t } from "i18next";
import { motion, AnimatePresence } from 'framer-motion'

import GoogleIcon from '@/src/assets/google-icon.svg'
import { EmailLogin } from "./EmailLogin";
import { EmailSignup } from "./EmailSignup";

export function EmailAuth() {
    const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login')

    return (
        <Stack direction="vertical" stackProps={{ className: 'justify-between size-full' }}>
            <div className="relative w-full flex-grow overflow-x-hidden overflow-y-auto">
                <AnimatePresence mode='sync'>
                    {emailMode === 'login' &&
                        <motion.div
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: '0%', opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            className="absolute top-0 w-full"
                            key={emailMode}
                        >
                            <EmailLogin goToSignup={() => setEmailMode('signup')} />
                        </motion.div>
                    }

                    {emailMode === 'signup' &&
                        <motion.div
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: '0%', opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            className="absolute top-0 w-full"
                            key={emailMode}
                        >
                            <EmailSignup goToLogin={() => setEmailMode('login')} />
                        </motion.div>
                    }
                </AnimatePresence>
            </div>

            <Stack direction="vertical">
                <Stack stackProps={{ className: 'items-center mt-1' }}>
                    <div className="text-outline border-t flex-grow" />
                    <div className="text-outline text-xs">
                        {emailMode === 'login' ? t('authModal.orLoginWith') : t('authModal.orSignupWith')}
                    </div>
                    <div className="text-outline border-t flex-grow" />
                </Stack>

                <Stack stackProps={{ className: 'items-center w-full' }}>
                    <Button variant='outline' className='flex-grow'><img src={GoogleIcon} width={24} alt="Google Logo" /> {t('common.google')}</Button>
                </Stack>
            </Stack>
        </Stack>
    )
}
