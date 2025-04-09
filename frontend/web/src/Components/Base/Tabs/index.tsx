import { ComponentProps, ReactNode, useState } from "react";
import { Stack } from "../Stack";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { motion, AnimatePresence, MotionProps, Variants } from 'framer-motion'
import { cn } from "@/src/shadcn/lib/utils";

export type TabsProps = {
    tabs: { node: ReactNode, props?: ComponentProps<'div'> }[]
    tabContents: ReactNode[]
    defaultTab?: number
    onActiveTabChange?: (index: number) => Promise<void> | void
    containerProps?: ComponentProps<typeof Stack>
    tabContainerProps?: ComponentProps<typeof Stack>
    tabContentsContainerProps?: ComponentProps<'div'>
    animatePresenceProps?: ComponentProps<typeof AnimatePresence>
    contentMotionProps?: ComponentProps<'div'> & MotionProps
}

export function Tabs({ tabs, tabContents, defaultTab, onActiveTabChange, containerProps, tabContainerProps, tabContentsContainerProps, animatePresenceProps, contentMotionProps }: TabsProps) {
    const variants: Variants = {
        animate: { x: '0%', opacity: 1 },
        right: { x: '100%', opacity: 0 },
        left: { x: '-100%', opacity: 0 }
    }

    const [from, setFrom] = useState<string>('right')
    const [to, setTo] = useState<string>('left')

    const [activeTab, setActiveTabState] = useState<number>(defaultTab ?? 0)

    const setActiveTab = async (i: number) => {
        if (activeTab === i)
            return

        if (i < activeTab) {
            setFrom('left')
            setTo('left')
            setActiveTabState(i)
        }
        else {
            setFrom('right')
            setTo('right')
            setActiveTabState(i)
        }

        if (onActiveTabChange)
            await onActiveTabChange(i)
    }

    return (
        <Stack {...containerProps} stackProps={{ className: cn('items-stretch', containerProps?.stackProps?.className), ...containerProps?.stackProps }} direction='vertical'>
            <Stack {...tabContainerProps}>
                {tabs.map((t, i) =>
                    <div key={i} onClick={() => setActiveTab(i)} {...t.props}>
                        {t.node}
                    </div>
                )}
            </Stack>
            <Separator orientation='horizontal' />
            <div className="relative flex-grow overflow-hidden" {...tabContentsContainerProps}>
                <AnimatePresence initial={true} mode='sync' {...animatePresenceProps}>
                    <motion.div
                        variants={variants}
                        initial={from}
                        animate='animate'
                        exit={to}
                        className="absolute top-0 size-full"
                        {...contentMotionProps}
                        key={activeTab}
                    >
                        {tabContents[activeTab]}
                    </motion.div>
                </AnimatePresence>
            </div>
        </Stack>
    )
}
