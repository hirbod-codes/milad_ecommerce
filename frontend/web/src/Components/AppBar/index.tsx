import { memo, useContext, useState } from "react";
import { Button } from "../Base/Button";
import { Stack } from "../Base/Stack";
import { SiteLogo } from "../SiteLogo";
import { t } from "i18next";
import { AuthModal } from "../Auth/AuthModal";
import { Auth } from "@/src/Backend/Auth/Auth";
import { dispatch } from "@/src/Lib/Events";
import { LAYOUT_RERENDER } from "@/src/Pages/Layout";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { useNavigate } from "react-router";
import { UserCircleIcon } from "lucide-react";

export const AppBar = memo(function AppBar() {
    const feedback = useContext(FeedbackContext)
    const navigate = useNavigate()

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
                    :
                    <>
                        <Stack size={2} stackProps={{ className: 'items-center' }}>
                            <Button isIcon variant="text" size="sm" className="[&_svg]:size-7" onClick={() => navigate('/Dashboard/Roles')}><UserCircleIcon strokeWidth={1} /></Button>

                            <Button
                                variant="outline"
                                size='xs'
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
                        </Stack>
                    </>
                }
            </Stack>

            <AuthModal open={authModalOpen} onClose={() => { setAuthModalOpen(false); if (Auth.getToken()) dispatch(LAYOUT_RERENDER, Auth.getToken()) }} />
        </>
    )
})
