import { cn } from "@/src/shadcn/lib/utils"
import { ComponentProps, memo, ReactNode, useContext } from "react"
import { ripple } from "../helpers"
import { IColor } from "@/src/Lib/Colors/IColor"
import { validateColor } from "@/src/Lib/Colors/helpers"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"

export type CheckBoxProps = {
    size?: 'xl' | 'lg' | 'md' | 'sm' | 'xs'
    label?: string | ReactNode,
    labelFirst?: boolean,
    inputId?: string,
    rippleEffect?: boolean,
    color?: string | IColor,
    colorForeground?: string | IColor,
    effectColor?: string | IColor,
    containerProps?: ComponentProps<'label'>,
    inputProps?: ComponentProps<'input'>
}

export const CheckBox = memo(function CheckBox({
    size = 'md',
    label,
    labelFirst = false,
    inputId,
    rippleEffect = true,
    color,
    colorForeground,
    effectColor = 'rgba(255, 255, 255, 0.7)',
    containerProps,
    inputProps
}: CheckBoxProps) {
    if (color === undefined || colorForeground === undefined) {
        const t = useContext(ConfigurationContext)!.themeOptions

        color = t.colors.primary[t.mode].main
        colorForeground = t.colors.primary[t.mode].foreground
    }

    color = validateColor(color)
    colorForeground = validateColor(colorForeground)
    effectColor = validateColor(effectColor)

    let sizeClass: string[] = []
    switch (size) {
        case 'xl':
            sizeClass = ['size-7', 'size-14']
            break;

        case 'lg':
            sizeClass = ['size-7', 'size-12']
            break;

        case 'md':
            sizeClass = ['size-5', 'size-9']
            break;

        case 'sm':
            sizeClass = ['size-4', 'size-8']
            break;

        case 'xs':
            sizeClass = ['size-3', 'size-7']
            break;

        default:
            break;
    }

    return (
        <label htmlFor={inputId ?? (typeof (label) === 'string' ? label : 'checkboxId')} {...containerProps} className={cn(["select-none cursor-pointer flex flex-row items-center"], containerProps?.className)}>
            {labelFirst &&
                <div>{label}</div>
            }

            <div className={`overflow-hidden relative rounded-full block ${sizeClass[1]} m-1`} onClick={(e) => { if (rippleEffect) ripple(e, color, true) }}>
                <input type="checkbox" id={inputId ?? (typeof (label) === 'string' ? label : 'checkboxId')} {...inputProps} className={cn(["hidden invisible peer"], inputProps?.className)} />

                <div className={cn(`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border rounded-sm ${sizeClass[0]} peer-checked:*:block`, inputProps?.className)}>
                    <svg
                        style={{ backgroundColor: color }}
                        className="hidden"
                        viewBox="0 0 20 20"
                        fill={colorForeground}
                        stroke={colorForeground}
                        strokeWidth="1"
                    >
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                </div>

                <div
                    className="absolute size-full top-0 left-0 opacity-0 transition-opacity duration-100 hover:opacity-10"
                    style={{ borderRadius: 'inherit', backgroundColor: effectColor }}
                />
            </div>

            {!labelFirst &&
                <div>{label}</div>
            }
        </label>
    )
})

