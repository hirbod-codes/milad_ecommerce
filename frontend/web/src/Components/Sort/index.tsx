import { Fragment, useState } from 'react'
import { Stack } from '../Base/Stack'
import { Sort as SortType } from './index.d'
import { Button } from '../Base/Button'
import { PlusIcon, SortAscIcon, SortDescIcon, Trash2Icon } from 'lucide-react'
import { Select } from '../Base/Select'
import { Separator } from '@/src/shadcn/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { t } from 'i18next'

export function Sort({ open, onClose, fields, displayFields, sorts, setSorts, apply }: { apply?: () => void, open: boolean, onClose?: () => void, fields: { [k: string]: string }, displayFields: { [k: string]: string }, sorts: SortType, setSorts: (sorts: SortType) => void }) {
    const [value, setValue] = useState(undefined)

    console.log('Sort', { open, fields, sorts, displayFields })

    return createPortal(
        <AnimatePresence>
            {open &&
                <motion.div
                    initial={{ x: '100%' }}
                    exit={{ x: '100%' }}
                    animate={{ x: 0 }}
                    className="absolute top-0 z-[49] h-screen w-screen"
                    onClick={(e) => { e.stopPropagation(); if (onClose) onClose() }}
                >
                    <div className='z-50 w-1/2 absolute top-0 right-0 bg-surface-container-high border rounded-lg overflow-y-auto h-full' onClick={(e) => { e.stopPropagation(); }}>
                        <Stack direction='vertical' stackProps={{ className: "w-full h-max p-2 px-6" }}>
                            {
                                sorts.map(m =>
                                    <Stack key={m.field}>
                                        <Select
                                            onValueSelect={(e: '$and' | '$or') => { setValue(e); setSorts(sorts.map(s => { if (s.field !== m.field) return s; s.field = e; return s })) }}
                                            inputProps={{
                                                containerProps: { className: 'flex-grow' },
                                                labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                                value: value ?? '',
                                                onChange: (e) => { setValue(e.target.value.trim()); if (fields[e.target.value.trim()] !== undefined) setSorts(sorts.map(s => { if (s.field !== m.field) return s; s.field = e.target.value; return s })) },
                                            }}
                                            dropdownMenuProps={{ containerProps: { className: 'my-2 border shadow-lg' } }}
                                            listContainerProps={{ stackProps: { className: 'p-2 max-h-[15cm] overflow-y-auto overflow-x-hidden' } }}
                                            stopPropagation={true}
                                        >
                                            {
                                                Object.keys(fields).filter(f => sorts.find(s => s.field === f) === undefined).map((k, i) =>
                                                    <Fragment key={i}>
                                                        <Select.Item key={i} value={k} displayValue={displayFields[k] ?? k}>
                                                            {displayFields[k] ?? k}
                                                        </Select.Item>
                                                        {i !== Object.keys(fields).length - 1 &&
                                                            <Separator />
                                                        }
                                                    </Fragment>
                                                )
                                            }
                                        </Select>

                                        <Stack>
                                            <Button isIcon variant='text' onClick={() => setSorts(sorts.map(s => { if (s.field !== m.field) return s; s.direction = s.direction === 'asc' ? 'desc' : 'asc'; return s }))}>
                                                {m.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
                                            </Button>

                                            <Button isIcon variant='text' fgColor={'error'} onClick={() => setSorts(sorts.filter(f => f.field !== m.field))}>
                                                <Trash2Icon />
                                            </Button>
                                        </Stack>
                                    </Stack>
                                )
                            }

                            <Button isIcon variant='text' fgColor={'success'} onClick={() => { if (sorts.find(f => f.field === '') === undefined) setSorts([...sorts, { field: '', direction: 'asc' }]) }}>
                                <PlusIcon />
                            </Button>

                            <Button onClick={() => { if (apply) apply() }}>{t('common.apply')}</Button>
                        </Stack>
                    </div>
                </motion.div>
            }
        </AnimatePresence >,
        document.body
    )
}
