import { Filters as FiltersType } from "./index.d"
import { Filters } from "./Filters"
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from "react-dom"
import { Button } from "../Base/Button"
import { t } from "i18next"
import { Stack } from "../Base/Stack"

/**
 * 
 * @param fields keys are names of fields an values are types of fields
 * @returns 
 */
export function SearchFilter({ open, onClose, fields, displayFields, filters, setFilters, apply }: { apply?: () => void, open: boolean, onClose?: () => void, fields: { [k: string]: string }, displayFields?: { [k: string]: string }, filters: FiltersType, setFilters: (v: FiltersType) => void }) {
    console.log('SearchFilter', { open, fields, filters, displayFields })

    return createPortal(
        <AnimatePresence>
            {open &&
                <motion.div
                    initial={{ x: '100%' }}
                    exit={{ x: '100%' }}
                    animate={{ x: 0 }}
                    className="absolute top-0 z-[49] h-screen w-full"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onClose) onClose() }}
                >
                    <Stack direction='vertical' stackProps={{ className: 'z-50 w-1/2 absolute top-0 right-0 bg-surface-container-high border rounded-lg h-full p-2', onClick: (e) => { e.preventDefault(); e.stopPropagation(); } }}>
                        <Filters
                            fields={fields}
                            displayFields={displayFields}
                            filters={filters}
                            setFilters={setFilters}
                        />

                        <Button onClick={() => { if (apply) apply() }}>{t('common.apply')}</Button>
                    </Stack>
                </motion.div>
            }
        </AnimatePresence>,
        document.body
    )
}
