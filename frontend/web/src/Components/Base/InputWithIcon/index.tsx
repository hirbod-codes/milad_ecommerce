import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { cn } from "@/src/shadcn/lib/utils";
import { ComponentProps, ReactNode, RefObject, useContext } from "react";

export function InputWithIcon({ startIcon, startIconProps, endIcon, endIconProps, inputRef, ...props }: { startIcon?: ReactNode, startIconProps?: ComponentProps<'div'>, endIcon?: ReactNode, endIconProps?: ComponentProps<'div'>, inputRef?: RefObject<HTMLInputElement | null> } & ComponentProps<'input'>) {
    let local = useContext(ConfigurationContext)!.local

    let si = local.direction === 'ltr' ? startIcon : endIcon
    let ei = local.direction === 'ltr' ? endIcon : startIcon

    let siProps = local.direction === 'ltr' ? startIconProps : endIconProps
    let eiProps = local.direction === 'ltr' ? endIconProps : startIconProps

    return (
        <div className="relative">
            {si && (
                <div {...siProps} className={cn("absolute left-1.5 top-1/2 transform -translate-y-1/2", siProps?.className)}>
                    {si}
                </div>
            )}
            <input
                ref={inputRef}
                {...props}
                type={props?.type ?? 'text'}
                className={cn(
                    `cursor-pointer flex h-10 w-full rounded-md border border-input bg-surface py-2 px-4 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50${startIcon ? ' pl-8' : ''}${endIcon ? 'pr-8' : ''}`,
                    props?.className
                )}
                style={{ direction: local.direction, ...props?.style }}
            />
            {ei && (
                <div {...eiProps} className={cn("absolute right-3 top-1/2 transform -translate-y-1/2", eiProps?.className)}>
                    {ei}
                </div>
            )}
        </div>
    );
}
InputWithIcon.displayName = "Input";
