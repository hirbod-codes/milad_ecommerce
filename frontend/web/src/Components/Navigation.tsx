import { t } from 'i18next';
import { memo, useContext, useRef, useState } from 'react';
import { ConfigurationContext } from '../Contexts/Configuration/ConfigurationContext';
import { useNavigate } from 'react-router-dom';
import { DatabaseIcon, HistoryIcon, HomeIcon, PaintRollerIcon, SettingsIcon, ShieldAlertIcon, TimerIcon, UsersIcon } from 'lucide-react';
import { Button } from './Base/Button';
import { motion } from 'framer-motion'

export const Navigation = memo(function Navigation() {
    const navigate = useNavigate();

    const configuration = useContext(ConfigurationContext)!

    // Navigation
    const [openDrawer, setOpenDrawer] = useState(false)
    const [destination, setDestination] = useState<string | undefined>(undefined)
    const timer = useRef<any | undefined>(undefined)

    const readsUsers = true
    const readsPatients = true
    const readsVisits = true
    const readsMedicalHistories = true

    console.log('Navigation', { configuration, openDrawer })

    const moveTo = (destination: string) => {
        setTimeout(() => {
            navigate(destination)
        }, 50)
    }

    return (
        <>
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

                    {readsPatients &&
                        <Button
                            variant='text'
                            fgColor={window.location.pathname !== '/Patients' ? 'surface-foreground' : 'primary'}
                            className='w-full justify-start rounded-none'
                            onClick={() => { if (window.location.pathname !== '/Patients') { setOpenDrawer(false); setDestination('/Patients') } }}
                        >
                            <motion.div layout>
                                <ShieldAlertIcon />
                            </motion.div>
                            {openDrawer &&
                                <motion.div layout>
                                    {t('Navigation.patients')}
                                </motion.div>
                            }
                        </Button>}

                    <div className='mb-2' />

                    {readsVisits &&
                        <Button
                            variant='text'
                            fgColor={window.location.pathname !== '/Visits' ? 'surface-foreground' : 'primary'}
                            className='w-full justify-start rounded-none'
                            onClick={() => { if (window.location.pathname !== '/Visits') { setOpenDrawer(false); setDestination('/Visits') } }}
                        >
                            <motion.div layout>
                                <TimerIcon />
                            </motion.div>
                            {openDrawer &&
                                <motion.div layout>
                                    {t('Navigation.visits')}
                                </motion.div>
                            }
                        </Button>}

                    <div className='mb-2' />

                    {readsMedicalHistories &&
                        <Button
                            variant='text'
                            fgColor={window.location.pathname !== '/MedicalHistories' ? 'surface-foreground' : 'primary'}
                            className='w-full justify-start rounded-none'
                            onClick={() => { if (window.location.pathname !== '/MedicalHistories') { setOpenDrawer(false); setDestination('/MedicalHistories') } }}
                        >
                            <motion.div layout>
                                <HistoryIcon />
                            </motion.div>
                            {openDrawer &&
                                <motion.div layout>
                                    {t('Navigation.MedicalHistories')}
                                </motion.div>
                            }
                        </Button>}

                    <div className='mb-8' />

                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/ThemeSettings' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/ThemeSettings') { setOpenDrawer(false); setDestination('/ThemeSettings') } }}
                    >
                        <motion.div layout>
                            <PaintRollerIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t("Navigation.Theme")}
                            </motion.div>
                        }
                    </Button>

                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/General' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/General') { setOpenDrawer(false); setDestination('/General') } }}
                    >
                        <motion.div layout>
                            <SettingsIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t("Navigation.general")}
                            </motion.div>
                        }
                    </Button>

                    <div className='mb-8' />

                    <Button
                        variant='text'
                        fgColor={window.location.pathname !== '/DbSettings' ? 'surface-foreground' : 'primary'}
                        className='w-full justify-start rounded-none'
                        onClick={() => { if (window.location.pathname !== '/DbSettings') { setOpenDrawer(false); setDestination('/DbSettings') } }}
                    >
                        <motion.div layout>
                            <DatabaseIcon />
                        </motion.div>
                        {openDrawer &&
                            <motion.div layout>
                                {t("Navigation.Db")}
                            </motion.div>
                        }
                    </Button>
                </motion.div>
            </div>
        </>
    )
})
