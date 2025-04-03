import { Fragment, useEffect, useState } from 'react'
import { Separator } from '@/src/shadcn/components/ui/separator'
import { Stack } from '../Base/Stack'
import { Select } from '../Base/Select'
import { SearchIcon } from 'lucide-react'
import { array } from 'yup'
import { fetchData, getApiUrl } from '@/src/Backend/helpers'
import { CheckBox } from '../Base/CheckBox'
import { t } from 'i18next'
import { CircularLoading } from '../Base/CircularLoading'
import { Tag } from './index.d'

export function SearchTag({ selectedTags = [], onChange = (): void => { } }: { selectedTags?: string[], onChange?: (tags: string[]) => void }) {
    if (!selectedTags)
        selectedTags = []

    if (!onChange)
        onChange = () => { }

    const [searchTag, setSearchTag] = useState<string>('')
    const [searchedCategories, setSearchedCategories] = useState<string[]>([])
    const [tags, setTags] = useState<Tag[]>([])

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetchData(`${getApiUrl()}/tags`),
        ])
            .then(async r => {
                console.log('SearchTag r', r)

                if (r[0].response && r[0].response.ok && array().required().isValidSync(r[0].data))
                    setTags(r[0].data)

                setLoading(false)
            })
    }, [])

    return (
        loading
            ? <CircularLoading />
            : <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4 *:px-2' }}>
                <div className="text-lg">{t('SearchTag.Categories')}</div>

                <Separator className="mx-2 w-auto" />

                <Select
                    onValueSelect={e => { }}
                    listContainerProps={{ stackProps: { className: 'max-h-[10cm] overflow-y-auto' } }}
                    inputProps={{
                        containerProps: { className: "flex-grow" },
                        labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                        className: 'pl-8',
                        startIcon: <SearchIcon />,
                        value: searchTag ?? '',
                        onChange: (e) => {
                            let v = e.target.value.trim()
                            setSearchTag(v)
                            if (!v)
                                setSearchedCategories([])
                            else
                                setSearchedCategories(tags?.filter(f => f.name.toLocaleLowerCase().includes(v.toLocaleLowerCase())).map(m => m.name.toLocaleLowerCase()))
                        }
                    }}
                    stopPropagation={true}
                >
                    {...tags?.filter(f => searchedCategories.includes(f.name.toLocaleLowerCase()))?.map((c, i) =>
                        <Fragment key={i}>
                            <CheckBox
                                label={c.name}
                                inputProps={{
                                    checked: selectedTags?.find(f => f === c.name) !== undefined,
                                    onChange: (e) => {
                                        if (e.target.checked && selectedTags?.find(f => f === c.name) === undefined)
                                            onChange([...selectedTags, c.name])
                                        if (!e.target.checked && selectedTags?.find(f => f === c.name) !== undefined)
                                            onChange(selectedTags.filter(f => f !== c.name))
                                    }
                                }}
                            />
                            {i !== searchedCategories.length - 1 && <Separator />}
                        </Fragment>
                    )}
                </Select>

                <Separator className="mx-2 w-auto" />

                <Stack direction="vertical" size={1}>
                    {tags.map((c, i) =>
                        <CheckBox
                            key={i}
                            label={c.name}
                            inputProps={{
                                checked: selectedTags?.find(f => f === c.name) !== undefined,
                                onChange: (e) => {
                                    if (e.target.checked && selectedTags?.find(f => f === c.name) === undefined)
                                        onChange([...selectedTags, c.name])
                                    if (!e.target.checked && selectedTags?.find(f => f === c.name) !== undefined)
                                        onChange(selectedTags?.filter(f => f !== c.name))
                                }
                            }}
                        />
                    )}
                </Stack>
            </Stack>
    )
}
