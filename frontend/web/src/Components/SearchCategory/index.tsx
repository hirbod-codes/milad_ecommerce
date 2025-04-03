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
import { Category } from './index.d'
import { Button } from '../Base/Button'

export function SearchCategory({ selectedCategories = [], onChange = (): void => { } }: { selectedCategories?: string[], onChange?: (categories: string[]) => void }) {
    if (!selectedCategories)
        selectedCategories = []

    if (!onChange)
        onChange = () => { }

    const [searchCategory, setSearchCategory] = useState<string>('')
    const [searchedCategories, setSearchedCategories] = useState<string[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetchData(`${getApiUrl()}/categories`),
        ])
            .then(async r => {
                console.log('SearchCategory r', r)

                if (r[0].response && r[0].response.ok && array().required().isValidSync(r[0].data))
                    setCategories(r[0].data)

                setLoading(false)
            })
    }, [])

    return (
        loading
            ? <Stack stackProps={{ className: 'w-1/2 items-center justify-center' }}><CircularLoading /></Stack>
            : <Stack size={3} direction="vertical" stackProps={{ className: 'w-1/2 overflow-y-auto border rounded-lg shadow-lg py-4 *:px-2' }}>
                <div className="text-lg">{t('SearchCategory.Categories')}</div>

                <Separator className="mx-2 w-auto" />

                <Select
                    onValueSelect={e => { }}
                    listContainerProps={{ stackProps: { className: 'max-h-[10cm] overflow-y-auto' } }}
                    inputProps={{
                        containerProps: { className: "flex-grow" },
                        labelContainerProps: { stackProps: { className: 'w-full justify-between' } },
                        className: 'pl-8',
                        startIcon: <SearchIcon />,
                        value: searchCategory ?? '',
                        onChange: (e) => {
                            let v = e.target.value.trim()
                            setSearchCategory(v)
                            if (!v)
                                setSearchedCategories([])
                            else
                                setSearchedCategories(categories?.filter(f => f.name.toLocaleLowerCase().includes(v.toLocaleLowerCase())).map(m => m.name.toLocaleLowerCase()))
                        }
                    }}
                    stopPropagation={true}
                >
                    {...categories?.filter(f => searchedCategories.includes(f.name.toLocaleLowerCase()))?.map((c, i) =>
                        <Fragment key={i}>
                            <CheckBox
                                label={c.name}
                                inputProps={{
                                    checked: selectedCategories?.find(f => f === c.name) !== undefined,
                                    onChange: (e) => {
                                        if (e.target.checked && selectedCategories?.find(f => f === c.name) === undefined)
                                            onChange([...selectedCategories, c.name])
                                        if (!e.target.checked && selectedCategories?.find(f => f === c.name) !== undefined)
                                            onChange(selectedCategories.filter(f => f !== c.name))
                                    }
                                }}
                            />
                            {i !== searchedCategories.length - 1 && <Separator />}
                        </Fragment>
                    )}
                </Select>

                <Separator className="mx-2 w-auto" />

                <Stack direction="vertical" size={1}>
                    {categories.map((c, i) =>
                        <CheckBox
                            key={i}
                            label={c.name}
                            inputProps={{
                                checked: selectedCategories?.find(f => f === c.name) !== undefined,
                                onChange: (e) => {
                                    if (e.target.checked && selectedCategories?.find(f => f === c.name) === undefined)
                                        onChange([...selectedCategories, c.name])
                                    if (!e.target.checked && selectedCategories?.find(f => f === c.name) !== undefined)
                                        onChange(selectedCategories?.filter(f => f !== c.name))
                                }
                            }}
                        />
                    )}
                </Stack>
            </Stack>
    )
}
