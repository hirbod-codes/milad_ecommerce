import { GoogleAuthManager } from "@/src/Backend/Auth/GoogleAuthManager";
import { fetchData, getApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { Stack } from "@/src/Components/Base/Stack";
import { Navigation } from "@/src/Components/Categories/navigation";
import { Product } from "@/src/Components/Products/index.d";
import { ProductThumbnail } from "@/src/Components/Products/ProductThumbnail";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { t } from "i18next";
import { ArrowRight } from "lucide-react";
import { memo, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { array } from "yup";

export const Home = memo(function Home() {
    const feedback = useContext(FeedbackContext)

    const [queryVars, setQueryVars] = useSearchParams()
    const code = queryVars.get('code')

    const [trendingProducts, setTrendingProducts] = useState<Product[]>(undefined)
    const [popularProducts, setPopularProducts] = useState<Product[]>(undefined)

    const googleAuth = async () => {
        console.log('Home', 'googleAuth')

        try {
            if (code) {
                if (await GoogleAuthManager.authenticate(code) === true)
                    window.location.href = window.location.origin + window.location.pathname;
            } else
                console.log('no code')
        } catch (e) {
            console.error(e)
        }
    }

    const init = async () => {
        fetchData(`${getApiUrl()}/products/trending`)
            .then(r => {
                if (!r.response || !r.response.ok || !array().required().isValidSync(r.data)) {
                    feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') })
                    setTrendingProducts([])
                } else
                    setTrendingProducts(r.data)
            })
            .catch(e => feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') }))

        fetchData(`${getApiUrl()}/products/popular`)
            .then(r => {
                if (!r.response || !r.response.ok || !array().required().isValidSync(r.data)) {
                    feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') })
                    setPopularProducts([])
                } else
                    setPopularProducts(r.data)
            })
            .catch(e => { feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') }); setTrendingProducts([]) })
    }

    useEffect(() => {
        googleAuth()
        init()
    }, [])

    console.log('Home', { code })

    return (
        <>
            <Navigation />
            <Stack direction="vertical">
                {/* Trending */}
                <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg h-[8cm] p-2' }}>
                    <Stack stackProps={{ className: 'justify-between items-center' }}>
                        <div className="text-3xl">{t('Home.trending')}</div>
                        <Button variant='text' size='sm'>{t('Home.viewAll')}<ArrowRight /></Button>
                    </Stack>

                    <div className="w-full overflow-x-auto overflow-y-hidden flex-grow">
                        <Stack stackProps={{ className: 'items-start h-full w-max' }}>
                            {/* {
                                trendingProducts === undefined
                                    ? <CircularLoading />
                                    : trendingProducts.map((m, i) =>
                                        <ProductThumbnail
                                            key={i}
                                            product={m}
                                        />
                                    )
                            } */}
                        </Stack>
                    </div>
                </Stack>

                {/* Popular */}
                <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg h-[8cm] p-2' }}>
                    <Stack stackProps={{ className: 'justify-between items-center' }}>
                        <div className="text-3xl">{t('Home.popular')}</div>
                        <Button variant='text' size='sm'>{t('Home.viewAll')}<ArrowRight /></Button>
                    </Stack>

                    <div className="w-full overflow-x-auto overflow-y-hidden flex-grow">
                        <Stack stackProps={{ className: 'items-start h-full w-max' }}>
                            {popularProducts === undefined
                                ? <CircularLoading />
                                : popularProducts.map((m, i) =>
                                    <ProductThumbnail
                                        key={i}
                                        product={m}
                                    />
                                )}
                        </Stack>
                    </div>
                </Stack>
            </Stack>
        </>
    )
})
