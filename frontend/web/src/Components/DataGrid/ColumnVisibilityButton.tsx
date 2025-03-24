import { useContext, useRef, useState } from 'react'
import { t } from 'i18next'
import { DataGridContext } from './Context'
import { DropdownMenu } from '../Base/DropdownMenu'
import { Button } from '../../Components/Base/Button'
import { Switch } from '../Base/Switch'
import { Stack } from '../Base/Stack'
import { Columns3Icon } from 'lucide-react'

export function ColumnVisibilityButton() {
    const [open, setOpen] = useState<boolean>(false)

    const ref = useRef<HTMLButtonElement>(null)

    const table = useContext(DataGridContext)!.table!

    return (
        <>
            <Button buttonRef={ref} variant='outline' onClick={() => setOpen(true)}>
                <Columns3Icon />{t('Columns.columns')}
            </Button>

            <DropdownMenu
                anchorRef={ref}
                onOpenChange={(b) => { if (!b) setOpen(false) }}
                open={open}
                containerProps={{ className: 'bg-surface-container-high border mt-2 p-2 rounded-md' }}
            >
                <Stack direction='vertical'>
                    {
                        table.getAllColumns().map((column, i) =>
                            <Switch
                                key={i}
                                label={t(`Columns.${column.id}`)}
                                labelId={t(`Columns.${column.id}`)}
                                checked={column.getIsVisible()}
                                onCheckedChange={(e) => {
                                    const entries = table.getAllColumns().map(c => [c.id, column.id !== c.id ? (table.getVisibleFlatColumns().find(f => f.id === c.id) !== undefined) : e])
                                    table.setColumnVisibility(Object.fromEntries(entries))
                                }}
                            />
                        )
                    }
                </Stack>
            </DropdownMenu>
        </>
    )
}
