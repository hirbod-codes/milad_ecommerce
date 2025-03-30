import { t } from 'i18next';
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { ConfigurationContext } from '../Contexts/Configuration/ConfigurationContext';
import { useNavigate } from 'react-router-dom';
import { BoxIcon, ReplaceIcon, SettingsIcon, ShieldUserIcon, ShoppingBasketIcon, TagIcon, UsersIcon } from 'lucide-react';
import { Button } from './Base/Button';
import { motion } from 'framer-motion'
import { FeedbackContext } from '../Contexts/Feedback/FeedbackContext';
import { AuthContext } from '../Contexts/Auth/AuthContext';

export const Navigation = memo(function Navigation() {
    const privileges = useContext(AuthContext).privileges
    const feedback = useContext(FeedbackContext)
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
        if (privileges === undefined) {
            feedback.push({
                node: t('privileges.getFailure')
            })
            return
        }

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
                className='absolute flex flex-col overflow-auto h-full items-start justify-stretch w-fit bg-surface-container border rounded-lg shadow-sm px-1'
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

                {readsUsers &&
                    <Button
                        variant={window.location.pathname == '/Dashboard/Users' ? 'outline' : 'text'}
                        fgColor={window.location.pathname !== '/Dashboard/Users' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-lg'
                        onClick={() => { if (window.location.pathname !== '/Dashboard/Users') { setOpenDrawer(false); setDestination('/Dashboard/Users') } }}
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

                {readsRoles &&
                    <Button
                        variant={window.location.pathname == '/Dashboard/Roles' ? 'outline' : 'text'}
                        fgColor={window.location.pathname !== '/Dashboard/Roles' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-lg'
                        onClick={() => { if (window.location.pathname !== '/Dashboard/Roles') { setOpenDrawer(false); setDestination('/Dashboard/Roles') } }}
                    >
                        <motion.div layout>
                            <ShieldUserIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.roles')}
                            </motion.div>
                        }
                    </Button>}

                {writesCategories &&
                    <Button
                        variant={window.location.pathname == '/Dashboard/Categories' ? 'outline' : 'text'}
                        fgColor={window.location.pathname !== '/Dashboard/Categories' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-lg'
                        onClick={() => { if (window.location.pathname !== '/Dashboard/Categories') { setOpenDrawer(false); setDestination('/Dashboard/Categories') } }}
                    >
                        <motion.div layout>
                            <ReplaceIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.categories')}
                            </motion.div>
                        }
                    </Button>}

                {writesTags &&
                    <Button
                        variant={window.location.pathname == '/Dashboard/Tags' ? 'outline' : 'text'}
                        fgColor={window.location.pathname !== '/Dashboard/Tags' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-lg'
                        onClick={() => { if (window.location.pathname !== '/Dashboard/Tags') { setOpenDrawer(false); setDestination('/Dashboard/Tags') } }}
                    >
                        <motion.div layout>
                            <TagIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t('Navigation.tags')}
                            </motion.div>
                        }
                    </Button>}

                <Button
                    variant={window.location.pathname == '/Dashboard/Products' ? 'outline' : 'text'}
                    fgColor={window.location.pathname !== '/Dashboard/Products' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-lg'
                    onClick={() => { if (window.location.pathname !== '/Dashboard/Products') { setOpenDrawer(false); setDestination('/Dashboard/Products') } }}
                >
                    <motion.div layout>
                        <BoxIcon />
                    </motion.div>
                    {openDrawer &&
                        <motion.div layout>
                            {t('Navigation.products')}
                        </motion.div>
                    }
                </Button>

                <Button
                    variant={window.location.pathname == '/Dashboard/Orders' ? 'outline' : 'text'}
                    fgColor={window.location.pathname !== '/Dashboard/Orders' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-lg'
                    onClick={() => { if (window.location.pathname !== '/Dashboard/Orders') { setOpenDrawer(false); setDestination('/Dashboard/Orders') } }}
                >
                    <motion.div layout>
                        <ShoppingBasketIcon />
                    </motion.div>
                    {openDrawer &&
                        <motion.div layout>
                            {t('Navigation.orders')}
                        </motion.div>
                    }
                </Button>

                <Button
                    variant={window.location.pathname == '/Dashboard/Settings' ? 'outline' : 'text'}
                    fgColor={window.location.pathname !== '/Dashboard/Settings' ? 'surface-foreground' : 'primary'}
                    className='w-full justify-start rounded-lg'
                    onClick={() => { if (window.location.pathname !== '/Dashboard/Settings') { setOpenDrawer(false); setDestination('/Dashboard/Settings') } }}
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
