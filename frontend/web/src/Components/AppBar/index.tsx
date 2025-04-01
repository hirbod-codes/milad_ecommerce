import { memo, useContext, useRef, useState } from "react";
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
import { ClockIcon, EarthIcon, MoonIcon, SunIcon, UserCircleIcon } from "lucide-react";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DropdownMenu } from "../Base/DropdownMenu";

export const AppBar = memo(function AppBar() {
    const feedback = useContext(FeedbackContext)
    const conf = useContext(ConfigurationContext)
    const navigate = useNavigate()

    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const languageButtonRef = useRef<HTMLButtonElement>(null)

    const [zoneMenuOpen, setZoneMenuOpen] = useState(false)
    const zoneButtonRef = useRef<HTMLButtonElement>(null)

    console.log('AppBar')

    const [authModalOpen, setAuthModalOpen] = useState<boolean>(false)

    return (
        <>
            <Stack stackProps={{ className: 'items-center p-4' }}>
                <SiteLogo />
                <div className="flex-grow">
                </div>
                <Stack size={2} stackProps={{ className: 'items-center' }}>
                    <Button buttonRef={languageButtonRef} isIcon variant="text" size="sm" className="[&_svg]:size-7" onClick={() => setLanguageMenuOpen(true)}><EarthIcon strokeWidth={1} /></Button>

                    <Button buttonRef={zoneButtonRef} isIcon variant="text" size="sm" className="[&_svg]:size-7" onClick={() => setZoneMenuOpen(true)}><ClockIcon strokeWidth={1} /></Button>

                    <Button isIcon variant="text" size="sm" className="[&_svg]:size-7" onClick={() => conf.updateTheme(conf.themeOptions.mode === 'dark' ? 'light' : 'dark')}>{conf.themeOptions.mode === 'dark' ? <MoonIcon strokeWidth={1} /> : <SunIcon strokeWidth={1} />}</Button>

                    {Auth.isAuthenticated() === false
                        ? <Button variant="outline" size='sm' onClick={() => setAuthModalOpen(true)}>{t('common.login')}/{t('common.signup')}</Button>
                        : <>
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
                        </>
                    }
                </Stack>
            </Stack>

            <AuthModal open={authModalOpen} onClose={() => { setAuthModalOpen(false); if (Auth.getToken()) dispatch(LAYOUT_RERENDER, Auth.getToken()) }} />

            <DropdownMenu
                anchorRef={languageButtonRef}
                open={languageMenuOpen}
                onOpenChange={(b) => { if (!b) setLanguageMenuOpen(false) }}
                containerProps={{ className: 'rounded-md bg-surface-container-high my-0 shadow-md' }}
            >
                <Stack direction="vertical" stackProps={{ className: '*:m-1' }}>
                    <Button variant={conf.local.language === 'fa' ? 'outline' : "text"} fgColor={conf.local.language === 'fa' ? 'primary' : 'bg-surface-container-foreground'} size="sm" className="[&_svg]:size-7" onClick={() => { setLanguageMenuOpen(false); conf.updateLocal('fa', conf.local.calendar, 'rtl', conf.local.zone) }}>FA</Button>
                    <Button variant={conf.local.language === 'en' ? 'outline' : "text"} fgColor={conf.local.language === 'en' ? 'primary' : 'bg-surface-container-foreground'} size="sm" className="[&_svg]:size-7" onClick={() => { setLanguageMenuOpen(false); conf.updateLocal('en', conf.local.calendar, 'ltr', conf.local.zone) }}>EN</Button>
                </Stack>
            </DropdownMenu>

            <DropdownMenu
                anchorRef={zoneButtonRef}
                open={zoneMenuOpen}
                onOpenChange={(b) => { if (!b) setZoneMenuOpen(false) }}
                containerProps={{ className: 'rounded-md bg-surface-container-high my-0 shadow-md' }}
            >
                <Stack direction="vertical" stackProps={{ className: '*:m-1' }}>
                    <Button variant={conf.local.language === 'fa' ? 'outline' : "text"} fgColor={conf.local.language === 'fa' ? 'primary' : 'bg-surface-container-foreground'} size="sm" className="[&_svg]:size-7" onClick={() => { setZoneMenuOpen(false); conf.updateLocal(conf.local.language, conf.local.calendar, conf.local.direction, 'Asia/Tehran') }}>Asia/Tehran</Button>
                    <Button variant={conf.local.language === 'en' ? 'outline' : "text"} fgColor={conf.local.language === 'en' ? 'primary' : 'bg-surface-container-foreground'} size="sm" className="[&_svg]:size-7" onClick={() => { setZoneMenuOpen(false); conf.updateLocal(conf.local.language, conf.local.calendar, conf.local.direction, 'UTC') }}>UTC</Button>
                </Stack>
            </DropdownMenu>
        </>
    )
})
