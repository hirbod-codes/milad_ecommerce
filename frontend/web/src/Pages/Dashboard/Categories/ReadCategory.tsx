import { fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Input } from "@/src/Components/Base/Input";
import { Stack } from "@/src/Components/Base/Stack";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { t } from "i18next";
import { useEffect, useState } from "react";
import { array } from "yup";
import { Category } from "./index.d";

export function ReadCategory({ category }: { category: Category }) {
    const [languages, setLanguages] = useState<string[] | undefined>(undefined)

    const [loading, setLoading] = useState<boolean>(true)

    console.log('CreateCategory', { category })

    const init = () => {
        Promise.all([
            fetchData(`${getApiUrl()}/languages`),
        ])
            .then(r => {
                console.log('r', r)
                if (r[0].response && r[0]?.response?.ok && array().required().isValidSync(r[0].data))
                    setLanguages(r[0].data)

                setLoading(false)
            })
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <>
            <Stack direction="vertical">
                <h5 className="text-center text-xl">{t('CreateCategory.createTag')}</h5>

                <Separator />

                {/* Tag name */}
                <Input value={category.name ?? ''} readOnly label={t('CreateCategory.name')} labelId={t('CreateCategory.name')} />

                {!loading && languages &&
                    <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                        <div className="text-lg">{t('CreateCategory.DisplayNameTitle')}</div>

                        {languages.map((l, i) =>
                            <Stack key={i} direction="vertical">
                                <Input placeholder={l} value={category.displayName ? category.displayName[l] ?? '' : ''} readOnly />
                            </Stack>
                        )}
                    </Stack>
                }

                {category?.recommendedProductProperties?.map((p, i) =>
                    <Stack key={i} direction="vertical">
                        <Input placeholder={t('UpdateCategory.field')} value={p.name} readOnly />

                        {!loading && languages &&
                            <Stack direction='vertical' stackProps={{ className: "border rounded-lg shadow-lg p-2" }}>
                                <div className="text-lg">{t('CreateCategory.DisplayFieldTitle')}</div>

                                {languages.map((l, i) =>
                                    <Stack key={i} direction="vertical">
                                        <Input placeholder={l} value={p.display ? p.display[l] ?? '' : ''} readOnly />
                                    </Stack>
                                )}
                            </Stack>
                        }
                    </Stack>
                )}
            </Stack>
        </>
    )
}

