import { Filter as FilterType, Filters as FiltersType } from "./index.d"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/src/shadcn/components/ui/accordion"
import { Stack } from "../Base/Stack"
import { t } from "i18next"
import { Select } from "../Base/Select"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { Button } from "../Base/Button"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Filter } from "./Filter"
import { memo, useRef, useState } from "react"

export const Filters = memo(function Filters({ fields, displayFields, filters, setFilters, unsetFilters }: { fields: { [k: string]: string }, displayFields?: { [k: string]: string }, filters?: FiltersType, setFilters: (v: FiltersType) => void, unsetFilters?: (id) => void }) {
    const lastId = useRef(0)
    const getId = () => {
        lastId.current++
        return lastId.current
    }

    if (filters === undefined)
        filters = { $and: [{ id: getId() }] }

    const key = Object.keys(filters).filter(f => f !== 'id')[0] ?? '$and'

    console.log('Filters', { fields, filters, lastId: lastId.current })

    return (
        <Accordion type="single" collapsible className='w-full p-4'>
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <Stack stackProps={{ className: 'w-full justify-between mr-2' }}>
                        <Select
                            onValueSelect={(e: '$and' | '$or') => setFilters({ id: filters?.id, [e]: filters[key] })}
                            inputProps={{
                                labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                                value: key,
                                readOnly: true
                            }}
                            stopPropagation={true}
                        >
                            <Select.Item value={'$and'} displayValue={t('Filters.and')}>
                                {t('Filters.and')}
                            </Select.Item>
                            <Separator />
                            <Select.Item value={'$or'} displayValue={t('Filters.or')}>
                                {t('Filters.or')}
                            </Select.Item>
                        </Select>

                        {unsetFilters && <Button isIcon variant="text" fgColor="error" onClick={() => unsetFilters(filters.id)}><Trash2Icon /></Button>}
                    </Stack>
                </AccordionTrigger>
                <AccordionContent>
                    <Stack direction="vertical">
                        {filters[key].map((filter, i) =>
                            (Object.keys(filter).includes('$and') || Object.keys(filter).includes('$or'))
                                ? <div className="pl-8">
                                    <Filters
                                        key={filter.id}
                                        fields={fields}
                                        filters={filter as FiltersType}
                                        setFilters={(v) => setFilters({ id: filters.id, [key]: filters[key].map(m => { if (m.id === filter.id) return v; else return m }) })}
                                        unsetFilters={(id) => setFilters({ id: filters.id, [key]: filters[key].filter(f => f.id !== id) })}
                                    />
                                </div>
                                : <Filter
                                    key={filter.id}
                                    fields={fields}
                                    displayFields={displayFields}
                                    filter={filter as FilterType}
                                    setFilter={(v) => setFilters({ id: filters.id, [key]: filters[key].map(m => { if (m.id === filter.id) return v; else return m }) })}
                                    unsetFilter={(id) => setFilters({ id: filters.id, [key]: filters[key].filter(f => f.id !== id) })}
                                />
                        )}

                        <Stack key={filters[key].length} stackProps={{ className: 'w-full' }}>
                            <Button variant="outline" className="flex-grow" onClick={() => { filters[key].push({ id: getId(), $and: [] }); setFilters({ ...filters }) }}>{t('Filters.addLogic')}<PlusIcon /></Button>
                            <Button variant="outline" className="flex-grow" onClick={() => { filters[key].push({ id: getId() }); setFilters({ ...filters }) }}>{t('Filters.addFilter')}<PlusIcon /></Button>
                        </Stack>
                    </Stack>
                </AccordionContent>
            </AccordionItem>
        </Accordion >
    )
})
