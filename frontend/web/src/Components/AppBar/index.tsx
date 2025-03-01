import { useState } from "react";
import { Button } from "../Base/Button";
import { Stack } from "../Base/Stack";
import { SiteLogo } from "../SiteLogo";
import { t } from "i18next";
import { AuthModal } from "../Auth/AuthModal";

export function AppBar() {
    const [authModalOpen, setAuthModalOpen] = useState<boolean>(false)

    return (
        <>
            <Stack stackProps={{ className: 'items-center p-4' }}>
                <SiteLogo />
                <div className="flex-grow border">
                    button
                </div>
                <Stack stackProps={{ className: 'items-center' }}>
                    <Button variant="outline" size='sm' onClick={() => setAuthModalOpen(true)}>{t('common.login')}/{t('common.signup')}</Button>
                </Stack>
            </Stack>

            <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    )
}

