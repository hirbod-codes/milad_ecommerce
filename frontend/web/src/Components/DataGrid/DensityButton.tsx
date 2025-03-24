import { t } from "i18next";
import { useContext, useRef, useState } from "react";
import { DataGridContext } from "./Context";
import { DropdownMenu } from "../Base/DropdownMenu";
import { Button } from "../../Components/Base/Button";
import { MenuIcon } from "lucide-react";
import { Stack } from "../Base/Stack";

export function DensityButton() {
    const ref = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useState<boolean>(false)

    const ctx = useContext(DataGridContext)!

    return (
        <>
            <Button variant="outline" buttonRef={ref} onClick={() => setOpen(true)}>
                <MenuIcon />{t('DataGrid.density')}
            </Button>

            <DropdownMenu
                anchorRef={ref}
                open={open}
                onOpenChange={(b) => { if (!b) setOpen(b) }}
                containerProps={{ className: 'bg-surface-container-high border mt-2 p-2 rounded-md' }}
            >
                <Stack direction="vertical">
                    <Button variant='text' onClick={() => ctx.density.set('compact')}>
                        {t('DataGrid.compact')}
                    </Button>
                    <Button variant='text' onClick={() => ctx.density.set('standard')}>
                        {t('DataGrid.standard')}
                    </Button>
                    <Button variant='text' onClick={() => ctx.density.set('comfortable')}>
                        {t('DataGrid.comfortable')}
                    </Button>
                </Stack>
            </DropdownMenu>
        </>
    )
}

