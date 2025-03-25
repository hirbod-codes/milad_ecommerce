import { useState } from "react";
import { Button } from "../Base/Button";
import { Stack } from "../Base/Stack";
import { SiteLogo } from "../SiteLogo";
import { t } from "i18next";
import { AuthModal } from "../Auth/AuthModal";
import { Auth } from "@/src/Backend/Auth/Auth";
import { dispatch } from "@/src/Lib/Events";
import { LAYOUT_RERENDER } from "@/src/Pages/Layout";
import { getAuthApiUrl } from "@/src/Backend/helpers";

export function AppBar() {
    console.log('AppBar')

    const [authModalOpen, setAuthModalOpen] = useState<boolean>(false)

    return (
        <>
            <Stack stackProps={{ className: 'items-center p-4' }}>
                <SiteLogo />
                <div className="flex-grow">
                    <Button
                        onClick={async () => {
                            let r = await fetch(`${getAuthApiUrl()}/auth/tokens/retrieve-access-token`, {
                                method: 'post',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                credentials: 'include',
                                mode: 'cors',
                                cache: 'no-cache'
                            })

                            console.log('r', r, await r.json())
                        }}
                    >
                        aaaa
                    </Button>
                </div>
                {Auth.isAuthenticated() === false
                    ? <Stack stackProps={{ className: 'items-center' }}>
                        <Button variant="outline" size='sm' onClick={() => setAuthModalOpen(true)}>{t('common.login')}/{t('common.signup')}</Button>
                    </Stack>
                    : <Button variant="outline" size='sm' onClick={() => { Auth.logout(); dispatch(LAYOUT_RERENDER) }}>{t('common.logout')}</Button>
                }
            </Stack>

            <AuthModal open={authModalOpen} onClose={() => { setAuthModalOpen(false); dispatch(LAYOUT_RERENDER, Auth.getToken()) }} />
        </>
    )
}
