import { useContext, useState } from "react";
import { Button } from "../Base/Button";
import { Stack } from "../Base/Stack";
import { SiteLogo } from "../SiteLogo";
import { t } from "i18next";
import { AuthModal } from "../Auth/AuthModal";
import { Auth } from "@/src/Backend/Auth/Auth";
import { dispatch } from "@/src/Lib/Events";
import { LAYOUT_RERENDER } from "@/src/Pages/Layout";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";

export function AppBar() {
    const feedback = useContext(FeedbackContext)

    console.log('AppBar')

    const [authModalOpen, setAuthModalOpen] = useState<boolean>(false)

    return (
        <>
            <Stack stackProps={{ className: 'items-center p-4' }}>
                <SiteLogo />
                <div className="flex-grow">
                </div>
                {Auth.isAuthenticated() === false
                    ? <Stack stackProps={{ className: 'items-center' }}>
                        <Button variant="outline" size='sm' onClick={() => setAuthModalOpen(true)}>{t('common.login')}/{t('common.signup')}</Button>
                    </Stack>
                    : <Button
                        variant="outline"
                        size='sm'
                        onClick={async () => {
                            const r = await Auth.logout()

                            if (!r)
                                feedback.push({ node: t('common.logoutFailed') })
                            else
                                dispatch(LAYOUT_RERENDER)
                        }}
                    >
                        {t('common.logout')}
                    </Button>
                }
            </Stack>

            <AuthModal open={authModalOpen} onClose={() => { setAuthModalOpen(false); dispatch(LAYOUT_RERENDER, Auth.getToken()) }} />
        </>
    )
}
