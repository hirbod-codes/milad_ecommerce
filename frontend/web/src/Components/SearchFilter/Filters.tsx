import { Filter as FilterType, Filters as FiltersType } from "./index.d"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/src/shadcn/components/ui/accordion"
import { Stack } from "../Base/Stack"
import { t } from "i18next"
import { Select } from "../Base/Select"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { Button } from "../Base/Button"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Filter } from "./Filter"

export function Filters({ fields, filters, setFilters, unsetFilters }: { fields: { [k: string]: string }, filters: FiltersType, setFilters: (v: FiltersType) => void, unsetFilters?: () => void }) {
    return (
        <Accordion type="single" collapsible className='w-full border rounded-lg p-4'>
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <Stack stackProps={{ className: 'w-full justify-between' }}>
                        <Select
                            label={t("Filters.operators")}
                            defaultDisplayValue={t('Filters.$and')}
                            defaultValue={'$and'}
                            onValueChange={(e: '$and' | '$or') => setFilters({ [e]: filters[Object.keys(filters)[0]] })}
                            inputProps={{ labelContainerProps: { stackProps: { className: 'w-full justify-between' } } }}
                        >
                            <Select.Item value={'$and'} displayValue={t('Filters.$and')}>
                                {t('Filters.$and')}
                            </Select.Item>
                            <Separator />
                            <Select.Item value={'$or'} displayValue={t('Filters.$or')}>
                                {t('Filters.$or')}
                            </Select.Item>
                        </Select>

                        {unsetFilters && <Button isIcon variant="text" fgColor="error" onClick={unsetFilters}><Trash2Icon /></Button>}
                    </Stack>
                </AccordionTrigger>
                <AccordionContent>
                    <Stack direction="vertical">
                        {filters[Object.keys(filters)[0]].length > 0 && filters[Object.keys(filters)[0]].map((filter, i) => {
                            if (Object.keys(filter).includes('$and') || Object.keys(filter).includes('$or'))
                                return <div className="px-8">
                                    <Filters
                                        key={i}
                                        fields={fields}
                                        filters={filter as FiltersType}
                                        setFilters={(v) => { filters[Object.keys(filters)[0]][i] = v; setFilters({ ...filters }) }}
                                        unsetFilters={() => { filters[Object.keys(filters)[0]] = filters[Object.keys(filters)[0]].slice(0, i).concat(filters[Object.keys(filters)[0]].slice(i + 1)); setFilters({ ...filters }) }}
                                    />
                                </div>
                            else
                                return <Filter
                                    key={i}
                                    fields={fields}
                                    filter={filter as FilterType}
                                    setFilter={(v) => { filters[Object.keys(filters)[0]][i] = v; setFilters({ ...filters }) }}
                                    unsetFilter={() => { filters[Object.keys(filters)[0]] = filters[Object.keys(filters)[0]].slice(0, i).concat(filters[Object.keys(filters)[0]].slice(i + 1)); setFilters({ ...filters }) }}
                                />
                        })}

                        <Stack stackProps={{ className: 'w-full' }}>
                            <Button variant="outline" className="flex-grow" onClick={() => { filters[Object.keys(filters)[0]].push({ $and: [] }); setFilters({ ...filters }) }}>{t('Filters.addLogic')}<PlusIcon /></Button>
                            <Button variant="outline" className="flex-grow" onClick={() => { filters[Object.keys(filters)[0]].push({}); setFilters({ ...filters }) }}>{t('Filters.addFilter')}<PlusIcon /></Button>
                        </Stack>
                    </Stack>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
