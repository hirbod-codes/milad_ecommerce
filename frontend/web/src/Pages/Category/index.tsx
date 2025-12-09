import { Fragment, useContext, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Stack } from "@/src/Components/Base/Stack"
import { fetchData, getApiUrl } from "@/src/Backend/helpers"
import { array } from "yup"
import { t } from "i18next"
import { Product } from "@/src/Components/Products"
import { Button } from "@/src/Components/Base/Button"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { ProductThumbnail } from "@/src/Components/Products/ProductThumbnail"
import { ArrowRight, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"

export function Category() {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const navigate = useNavigate()

    const [queryVars, setQueryVars] = useSearchParams()
    const categoryName = queryVars.get('category')

    const [trendingProducts, setTrendingProducts] = useState<Product[]>(undefined)
    const [topSellingProducts, setTopSellingProducts] = useState<Product[]>(undefined)
    const [mostViewedProducts, setMostViewedProducts] = useState<Product[]>(undefined)

    const [parentCategories, setParentCategories] = useState([])

    console.log('Category', { categoryName, trendingProducts, topSellingProducts, mostViewedProducts, parentCategories })

    useEffect(() => {
        setTrendingProducts(undefined)
        setTopSellingProducts(undefined)
        setMostViewedProducts(undefined)
        let category = configuration.categories?.find(f => f.name === categoryName)
        if (categoryName && category) {
            fetchData(`${getApiUrl()}/products/trending?duration=monthly&categories=${categoryName}`)
                .then(r => {
                    if (!r.response || !r.response.ok || !array().required().isValidSync(r.data)) {
                        feedback.pushError({ node: t('CategoriesNavigation.failedToFetchTrendingProducts') })
                        setTrendingProducts([])
                    } else
                        setTrendingProducts(r.data)
                })
                .catch(e => feedback.pushError({ node: t('CategoriesNavigation.failedToFetchTrendingProducts') }))

            fetchData(`${getApiUrl()}/products/topSelling?duration=monthly&categories=${categoryName}`)
                .then(r => {
                    if (!r.response || !r.response.ok || !array().required().isValidSync(r.data)) {
                        feedback.pushError({ node: t('CategoriesNavigation.failedToFetchTopSellingProducts') })
                        setTopSellingProducts([])
                    } else
                        setTopSellingProducts(r.data.slice(15, 28))
                })
                .catch(e => { feedback.pushError({ node: t('CategoriesNavigation.failedToFetchTopSellingProducts') }); setTrendingProducts([]) })

            fetchData(`${getApiUrl()}/products/mostViewed?duration=monthly&categories=${categoryName}`)
                .then(r => {
                    if (!r.response || !r.response.ok || !array().required().isValidSync(r.data)) {
                        feedback.pushError({ node: t('CategoriesNavigation.failedToFetchMostViewedProducts') })
                        setMostViewedProducts([])
                    } else
                        setMostViewedProducts(r.data.slice(15, 28))
                })
                .catch(e => { feedback.pushError({ node: t('CategoriesNavigation.failedToFetchMostViewedProducts') }); setTrendingProducts([]) })

            let parentId = category.parentCategory, parentCategories = [categoryName]
            if (parentId)
                do {
                    category = configuration.categories?.find(f => f._id === parentId)
                    if (!category)
                        break
                    parentCategories.unshift(category.name)
                    parentId = category?.parentCategory
                } while (parentId !== undefined)

            setParentCategories([...parentCategories])
        }
    }, [categoryName])

    const categorySeparator = configuration.local.direction === 'ltr' ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon />

    return (
        <Stack direction="vertical">
            <Stack stackProps={{ className: 'items-center p-2' }}>
                {parentCategories.map((n, i) =>
                    <Fragment key={i}>
                        <div className="text-sm text-outline cursor-pointer" onClick={() => navigate(`/Category?category=${n}`, { viewTransition: true, replace: true })}>
                            {configuration.categories?.find(f => f.name === n)?.displayName[configuration.local.language]}
                        </div>

                        <div className="text-outline">
                            {i !== (parentCategories.length - 1) && categorySeparator}
                        </div>
                    </Fragment>
                )}
            </Stack>

            {/* Trending */}
            {(trendingProducts === undefined || trendingProducts.length !== 0) &&
                <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg h-[11cm] p-2' }}>
                    <Stack stackProps={{ className: 'justify-between items-center' }}>
                        <div className="text-3xl">{t('Home.trending')}</div>
                        <Button variant='text' size='sm'>{t('Home.viewAll')}<ArrowRight /></Button>
                    </Stack>

                    <div className="w-full overflow-x-auto overflow-y-visible flex-grow pb-4">
                        <Stack stackProps={{ className: 'items-start h-full w-max' }}>
                            {
                                trendingProducts === undefined
                                    ? <CircularLoading />
                                    : trendingProducts.map((m, i) =>
                                        <ProductThumbnail
                                            key={i}
                                            product={m}
                                        />
                                    )
                            }
                        </Stack>
                    </div>
                </Stack>
            }

            {/* TopSelling */}
            {(topSellingProducts === undefined || topSellingProducts.length !== 0) &&
                <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg h-[11cm] p-2' }}>
                    <Stack stackProps={{ className: 'justify-between items-center' }}>
                        <div className="text-3xl">{t('Home.topSelling')}</div>
                        <Button variant='text' size='sm'>{t('Home.viewAll')}<ArrowRight /></Button>
                    </Stack>

                    <div className="w-full overflow-x-auto overflow-y-visible flex-grow pb-4">
                        <Stack stackProps={{ className: 'items-start h-full justify-start w-max' }}>
                            {topSellingProducts === undefined
                                ? <CircularLoading />
                                : topSellingProducts.map((m, i) =>
                                    <ProductThumbnail
                                        key={i}
                                        product={m}
                                    />
                                )}
                        </Stack>
                    </div>
                </Stack>
            }

            {/* MostViewed */}
            {(mostViewedProducts === undefined || mostViewedProducts.length !== 0) &&
                <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg h-[11cm] p-2' }}>
                    <Stack stackProps={{ className: 'justify-between items-center' }}>
                        <div className="text-3xl">{t('Home.mostViewed')}</div>
                        <Button variant='text' size='sm'>{t('Home.viewAll')}<ArrowRight /></Button>
                    </Stack>

                    <div className="w-full overflow-x-auto overflow-y-visible flex-grow pb-4">
                        <Stack stackProps={{ className: 'items-start h-full justify-start w-max' }}>
                            {mostViewedProducts === undefined
                                ? <CircularLoading />
                                : mostViewedProducts.map((m, i) =>
                                    <ProductThumbnail
                                        key={i}
                                        product={m}
                                    />
                                )}
                        </Stack>
                    </div>
                </Stack>
            }
        </Stack>
    )
}
