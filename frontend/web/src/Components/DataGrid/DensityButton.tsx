import { t } from "i18next";
import { useContext, useRef, useState } from "react";
import { DataGridContext } from "./Context";
import { DropdownMenu } from "../Base/DropdownMenu";
import { Button } from "../../Components/Base/Button";
import { AlignVerticalSpaceAround, MenuIcon, Rows2Icon, Rows3Icon, Rows4Icon } from "lucide-react";
import { Stack } from "../Base/Stack";

export function DensityButton() {
    const ref = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useState<boolean>(false)

    const ctx = useContext(DataGridContext)!

    return (
        <>
            <Button variant="outline" buttonRef={ref} onClick={() => setOpen(true)}>
                <AlignVerticalSpaceAround />
            </Button>

            <DropdownMenu
                anchorRef={ref}
                open={open}
                onOpenChange={(b) => { if (!b) setOpen(b) }}
                containerProps={{ className: 'bg-surface-container-high border mt-2 p-2 rounded-md' }}
            >
                <Stack direction="vertical">
                    <Button variant={ctx.density.value === 'comfortable' ? 'outline' : 'text'} onClick={() => ctx.density.set('comfortable')}>
                        <Rows2Icon />{t('DataGrid.comfortable')}
                    </Button>
                    <Button variant={ctx.density.value === 'standard' ? 'outline' : 'text'} onClick={() => ctx.density.set('standard')}>
                        <Rows3Icon />{t('DataGrid.standard')}
                    </Button>
                    <Button variant={ctx.density.value === 'compact' ? 'outline' : 'text'} onClick={() => ctx.density.set('compact')}>
                        <Rows4Icon />{t('DataGrid.compact')}
                    </Button>
                </Stack>
            </DropdownMenu>
        </>
    )
}

