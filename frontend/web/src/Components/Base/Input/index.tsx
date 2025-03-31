import { InputWithIcon as ReferenceInput } from "../InputWithIcon";
import { Label } from "@/src/shadcn/components/ui/label";
import { ComponentProps, memo, useEffect } from "react";
import { Tooltip } from "../Tooltip";
import { AnimatePresence, motion, MotionProps, useAnimate } from "framer-motion";
import { cn } from "@/src/shadcn/lib/utils";
import { Stack } from "../Stack";

const inputVariants = {
    animate: {
        y: '0%',
        opacity: 1
    },
    exit: {
        y: '-100%',
        opacity: 0
    },
}

export type InputProps = {
    label?: string
    labelId?: string
    errorText?: string
    helperText?: string
    containerProps?: MotionProps & ComponentProps<'div'>
    innerContainerProps?: MotionProps & ComponentProps<'div'>
    labelContainerProps?: ComponentProps<typeof Stack>
    animateHeight?: boolean
} & ComponentProps<typeof ReferenceInput>

export const Input = memo(function Input({ label, labelId, errorText, helperText, containerProps, inputRef, animateHeight = false, labelContainerProps, innerContainerProps, ...inputProps }: InputProps) {
    const input = <ReferenceInput inputRef={inputRef} id={labelId} {...inputProps} containerProps={innerContainerProps} />

    const [containerRef, animateContainerRef] = useAnimate()

    useEffect(() => {
        if (animateHeight && containerRef.current) {
            if (errorText !== undefined || helperText !== undefined)
                animateContainerRef(containerRef.current, { height: '1.5cm' })
            else
                animateContainerRef(containerRef.current, { height: '1cm' })
        }
    }, [errorText, helperText])

    return (
        <div ref={containerRef} {...containerProps} className={cn("flex flex-col relative", containerProps?.className)} style={{ height: animateHeight ? '1cm' : undefined, ...containerProps?.style }}>
            {label && labelId
                ? <Stack direction={labelContainerProps?.direction ?? 'horizontal'} stackProps={{ ...labelContainerProps?.stackProps, className: cn("items-center size-full last:m-0 m-0", labelContainerProps?.stackProps?.className) }}>
                    <Label htmlFor={labelId}>
                        {label}
                    </Label>
                    {input}
                </Stack>
                : input
            }

            <AnimatePresence mode='sync'>
                {errorText !== undefined
                    ?
                    <motion.div
                        key={0}
                        layout='position'
                        initial='exit'
                        animate='animate'
                        exit='exit'
                        variants={inputVariants}
                        transition={{ ease: [0.5, 0, 0.5, 1] }}
                        className="absolute px-2 -bottom-2 inline"
                    >
                        <Tooltip tooltipContent={errorText}>
                            <p className="text-left text-xs text-error text-nowrap text-ellipsis w-full overflow-hidden">
                                {errorText}
                            </p>
                        </Tooltip>
                    </motion.div>
                    :
                    (
                        helperText !== undefined
                            ?
                            <motion.div
                                key={1}
                                layout='position'
                                initial='exit'
                                animate='animate'
                                exit='exit'
                                variants={inputVariants}
                                transition={{ ease: [0.5, 0, 0.5, 1] }}
                                className="absolute px-2 -bottom-2 inline"
                            >
                                <Tooltip tooltipContent={helperText}>
                                    <p className="text-left text-xs text-surface-foreground text-nowrap text-ellipsis w-full overflow-hidden">
                                        {helperText}
                                    </p>
                                </Tooltip>
                            </motion.div>
                            : undefined
                    )
                }
            </AnimatePresence>
        </div >
    )
})
