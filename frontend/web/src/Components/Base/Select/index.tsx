import { ComponentProps, createContext, ReactElement, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { Stack } from "../Stack"
import { DropdownMenu } from "../DropdownMenu"
import { Button } from "../Button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "../Input"
import { CircularLoadingIcon } from "../CircularLoadingIcon"
import { cn } from "@/src/shadcn/lib/utils"

const SelectContext = createContext<{ stopPropagation?: boolean, updateSelection: ({ value, displayValue }: { value: string, displayValue: string }) => void } | undefined>(undefined)

export type SelectProps = {
    defaultValue?: string
    defaultDisplayValue?: string
    id?: string
    label?: string
    onValueChange: (v) => void | Promise<void>
    children: ReactElement[]
    loading?: boolean
    inputProps?: ComponentProps<typeof Input>
    canDropdownMenuWidthGrow?: boolean
    listContainerProps?: ComponentProps<typeof Stack>
    stopPropagation?: boolean
}

export function Select({ defaultValue, defaultDisplayValue, id, label, onValueChange, children, loading = false, inputProps, canDropdownMenuWidthGrow = true, listContainerProps, stopPropagation }: SelectProps) {
    const [value, setValue] = useState(defaultValue)
    const [displayValue, setDisplayValue] = useState(defaultDisplayValue)
    const [open, setOpen] = useState(false)

    const [width, setWidth] = useState('auto')

    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (defaultDisplayValue === undefined && defaultValue !== undefined)
            setDisplayValue(defaultValue)
    }, [])

    useEffect(() => {
        if (inputRef?.current)
            setWidth(inputRef.current.getBoundingClientRect().width.toFixed(2) + 'px')
    }, [inputRef, inputRef?.current])

    return (
        <>
            {loading
                ? <Button className="w-full [&_svg]:size-8" size='sm' variant="text" style={{ width }}>
                    <CircularLoadingIcon />
                </Button>
                : <Input
                    inputRef={inputRef}
                    label={label}
                    labelId={label}
                    id={id ?? label}
                    value={displayValue ?? ''}
                    readOnly
                    {...inputProps}
                    endIcon={inputProps?.endIcon ?? (open ? <ChevronUp /> : <ChevronDown />)}
                    className={cn('cursor-pointer', inputProps?.className)}
                    containerProps={{ ...inputProps?.containerProps, className: cn('cursor-pointer', inputProps?.containerProps?.className), onClick: (e) => { if (stopPropagation) e.stopPropagation(); setOpen(!open); if (inputProps?.containerProps?.onClick) inputProps.containerProps.onClick(e) } }}
                />
            }

            <DropdownMenu
                anchorRef={inputRef}
                open={open}
                onOpenChange={(b) => { if (!b) setOpen(false) }}
                containerProps={{ className: 'rounded-md bg-surface-container-high my-0 shadow-md' }}
            >
                <div style={canDropdownMenuWidthGrow ? { minWidth: width } : { width }}>
                    <SelectContext.Provider value={{
                        updateSelection: ({ value, displayValue }) => {
                            setValue(value)
                            setDisplayValue(displayValue)
                            setOpen(false)
                            if (onValueChange)
                                onValueChange(value)
                        },
                        stopPropagation
                    }}>
                        <Stack
                            direction="vertical"
                            {...listContainerProps}
                            stackProps={{
                                className: cn('p-2', listContainerProps?.stackProps?.className),
                                style: { minWidth: canDropdownMenuWidthGrow ? width : undefined, ...listContainerProps?.stackProps?.style },
                                ...listContainerProps?.stackProps
                            }}
                        >
                            {children}
                        </Stack>
                    </SelectContext.Provider>
                </div>
            </DropdownMenu>
        </>
    )
}

Select.Item = ({ children, value, displayValue, containerProps }: { children: ReactNode, value: string, displayValue?: string, containerProps?: ComponentProps<'div'> }) => {
    const c = useContext(SelectContext)

    if (displayValue === undefined)
        displayValue = value

    return (
        <div {...containerProps} onClick={(e) => {
            if (c?.stopPropagation === true)
                e.stopPropagation()

            c?.updateSelection({ value, displayValue })

            if (containerProps?.onClick)
                containerProps.onClick(e)
        }} className={cn("cursor-pointer", containerProps?.className)}>
            {children}
        </div>
    )
}
