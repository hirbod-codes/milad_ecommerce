import { ReactNode, useEffect, useRef, useState } from "react";
import { Feedback, FeedbackContext } from "./FeedbackContext";
import { createPortal } from "react-dom";
import { AnimatePresence } from 'framer-motion'
import { FeedbackNode } from "./FeedbackNode";
import { DateTime } from 'luxon'

export function FeedbackWrapper({ children }: { children?: ReactNode }) {
    const [stack, setStack] = useState<Feedback[]>([])

    const [hasInit, setHasInit] = useState<boolean>(false)

    const interval = useRef<NodeJS.Timeout>(undefined)

    console.log('-------------FeedbackWrapper', { hasInit, interval: interval.current, stack })

    useEffect(() => {
        if (interval.current !== undefined)
            clearInterval(interval.current)

        interval.current = setInterval(() => {
            let set = false
            let now = DateTime.utc().toUnixInteger()
            let newStack = [...stack]

            for (let i = 0; i < stack.length; i++)
                if ((stack[i].createdAt! + (stack[i].timeout ?? 6)) > now)
                    continue
                else {
                    set = true
                    newStack.splice(i, 1)
                }

            if (set)
                setStack(newStack)
        }, 1000)

        if (hasInit === false)
            setHasInit(true)
    }, [stack])

    return (
        <FeedbackContext.Provider value={{ push: (feedback) => { if (feedback.createdAt === undefined) feedback.createdAt = DateTime.utc().toUnixInteger(); setStack([...stack, feedback]) } }}>
            {hasInit === true && children}
            {createPortal(
                <>
                    <div className="fixed bottom-0 left-0 z-[150] p-4">
                        <AnimatePresence mode='sync'>
                            {stack.map((s, i) =>
                                <FeedbackNode
                                    key={i}
                                    id={i}
                                    bgColor={s.color?.bgColor}
                                    fgColor={s.color?.fgColor}
                                    rawBgColor={s.color?.rawBgColor}
                                    rawFgColor={s.color?.rawFgColor}
                                    closeButton={s.closeButton}
                                    onClose={s.closeButton !== false ? () => { stack.splice(i, 1); setStack([...stack]) } : undefined}
                                    props={s.props}
                                    closeButtonProps={s.closeButtonProps}
                                >
                                    {s.node}
                                </FeedbackNode>
                            )}
                        </AnimatePresence>
                    </div>
                </>,
                document.body
            )}
        </FeedbackContext.Provider>
    )
}
