import { t } from 'i18next';
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { ConfigurationContext } from '../Contexts/Configuration/ConfigurationContext';
import { useNavigate } from 'react-router-dom';
import { HistoryIcon, HomeIcon, SettingsIcon, ShieldAlertIcon, TimerIcon, UsersIcon } from 'lucide-react';
import { Button } from './Base/Button';
import { motion } from 'framer-motion'
import { Auth } from '../Backend/Auth/Auth';

export const Navigation = memo(function Navigation() {
    const navigate = useNavigate();

    const configuration = useContext(ConfigurationContext)!

    // Navigation
    const [openDrawer, setOpenDrawer] = useState(false)
    const [destination, setDestination] = useState<string | undefined>(undefined)
    const timer = useRef<any | undefined>(undefined)

    const [readsUsers, setReadsUsers] = useState(false)
    const [readsRoles, setReadsRoles] = useState(false)
    const [writesCategories, setWritesCategories] = useState(false)
    const [writesTags, setWritesTags] = useState(false)

    useEffect(() => {
        Auth.getPrivileges()
            .then(privileges => {
                for (const privilege of privileges) {
                    if (privilege === 'get-user')
                        setReadsUsers(true)
                    if (privilege === 'get-role')
                        setReadsRoles(true)
                    if (['create-category', 'update-category', 'delete-category'].includes(privilege))
                        setWritesCategories(true)
                    if (['create-tag', 'update-tag', 'delete-tag'].includes(privilege))
                        setWritesTags(true)
                }
            })
    }, [])

    console.log('Navigation', { configuration, openDrawer })

    const moveTo = (destination: string) => {
        setTimeout(() => {
            navigate(destination)
        }, 50)
    }

    return (
        <div className="relative z-20 size-full">
            <motion.div
                onClick={() => {
                    if (destination) {
                        moveTo(destination)
                        setDestination(undefined)
                    }
                }}
                onAnimationEnd={() => {
                    if (destination) {
                        moveTo(destination)
                        setDestination(undefined)
                    }
                }}
                layout
                className='absolute flex flex-col overflow-auto h-full items-start justify-stretch w-fit bg-surface-container border rounded-lg shadow-sm'
                onPointerEnter={() => {
                    timer.current = setTimeout(() => {
                        setOpenDrawer(true)
                    }, 1500)
                }}
                onPointerLeave={() => {
                    if (timer?.current)
                        clearTimeout(timer?.current)
                    setOpenDrawer(false)
                }}
            >
                <div className='mb-8' />

                <Button
                    variant='text'
                    fgColor={window.location.pathname !== '/' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-none'
                    onClick={() => { if (window.location.pathname !== '/') { setOpenDrawer(false); setDestination('/') } }}
                >
                    <motion.div layout>
                        <HomeIcon />
                    </motion.div>
                    {openDrawer &&
                        <motion.div layout>
                            {t('Navigation.home')}
                        </motion.div>
                    }
                </Button>

                <div className='mb-8' />

                {readsUsers &&
                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/Users' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/Users') { setOpenDrawer(false); setDestination('/Users') } }}
                    >
                        <motion.div layout>
                            <UsersIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.users')}
                            </motion.div>
                        }
                    </Button>}

                <div className='mb-2' />

                {readsRoles &&
                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/Roles' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/Roles') { setOpenDrawer(false); setDestination('/Roles') } }}
                    >
                        <motion.div layout>
                            <ShieldAlertIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.roles')}
                            </motion.div>
                        }
                    </Button>}

                <div className='mb-2' />

                {writesCategories &&
                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/Categories' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/Categories') { setOpenDrawer(false); setDestination('/Categories') } }}
                    >
                        <motion.div layout>
                            <TimerIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.categories')}
                            </motion.div>
                        }
                    </Button>}

                {writesTags &&
                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/Tags' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/Tags') { setOpenDrawer(false); setDestination('/Tags') } }}
                    >
                        <motion.div layout>
                            <TimerIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.tags')}
                            </motion.div>
                        }
                    </Button>}

                <Button
                    variant='text'
                    fgColor={window.location.pathname !== '/Products' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-none'
                    onClick={() => { if (window.location.pathname !== '/Products') { setOpenDrawer(false); setDestination('/Products') } }}
                >
                    <motion.div layout>
                        <TimerIcon />
                    </motion.div>
                    {openDrawer &&
                        <motion.div layout>
                            {t('Navigation.products')}
                        </motion.div>
                    }
                </Button>

                <div className='mb-2' />

                <Button
                    variant='text'
                    fgColor={window.location.pathname !== '/Orders' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-none'
                    onClick={() => { if (window.location.pathname !== '/Orders') { setOpenDrawer(false); setDestination('/Orders') } }}
                >
                    <motion.div layout>
                        <HistoryIcon />
                    </motion.div>
                    {openDrawer &&
                        <motion.div layout>
                            {t('Navigation.orders')}
                        </motion.div>
                    }
                </Button>

                <Button
                    variant='text'
                    fgColor={window.location.pathname !== '/Settings' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-none'
                    onClick={() => { if (window.location.pathname !== '/Settings') { setOpenDrawer(false); setDestination('/Settings') } }}
                >
                    <motion.div layout>
                        <SettingsIcon />
                    </motion.div>
                    {openDrawer &&
                        <motion.div layout>
                            {t("Navigation.settings")}
                        </motion.div>
                    }
                </Button>
            </motion.div>
        </div>
    )
})
