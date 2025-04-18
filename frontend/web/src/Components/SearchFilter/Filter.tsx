import { Fragment, memo } from "react"
import { Filter as FilterType, operators } from "./index.d"
import { Stack } from "../Base/Stack"
import { Input } from "../Base/Input"
import { t } from "i18next"
import { Select } from "../Base/Select"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { Button } from "../Base/Button"
import { Trash2Icon } from "lucide-react"

export const Filter = memo(function Filter({ fields, filter, displayFields = {}, setFilter, unsetFilter }: { fields: { [k: string]: string }, displayFields?: { [k: string]: string }, filter: FilterType, setFilter: (v: FilterType) => void, unsetFilter: (id: number) => void }) {
    console.log('Filter', { fields, filter })

    return (
        <Stack>
            <Select
                onValueSelect={(e) => setFilter({ ...filter, field: e })}
                inputProps={{ readOnly: true, value: filter?.field ?? '', labelContainerProps: { stackProps: { className: 'w-full justify-between' } } }}
                dropdownMenuProps={{ containerProps: { className: 'my-2 border shadow-lg' } }}
                listContainerProps={{ stackProps: { className: 'p-2 max-h-[15cm] overflow-y-auto overflow-x-hidden' } }}
                stopPropagation={true}
            >
                {
                    Object.keys(fields).map((k, i) =>
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

            <Select
                onValueSelect={(e) => setFilter({ ...filter, operator: e })}
                inputProps={{ readOnly: true, value: filter?.operator ?? '', labelContainerProps: { stackProps: { className: 'w-full justify-between' } } }}
            >
                {
                    Object.values(operators).map((o, i) =>
                        <Fragment key={i}>
                            <Select.Item key={i} value={operators[o]} displayValue={t('Filter.' + operators[o])}>
                                {t('Filter.' + operators[o])}
                            </Select.Item>
                            {i !== Object.values(operators).length - 1 &&
                                <Separator />
                            }
                        </Fragment>
                    )
                }
            </Select>

            <Input placeholder={t('Filter.value')} type={fields[filter.field] === 'number' ? 'number' : 'text'} value={filter.value} onChange={(e) => setFilter({ ...filter, value: e.target.value.trim() })} />

            <Button isIcon variant="text" fgColor="error" onClick={() => unsetFilter(filter.id)}><Trash2Icon /></Button>
        </Stack>
    )
})
