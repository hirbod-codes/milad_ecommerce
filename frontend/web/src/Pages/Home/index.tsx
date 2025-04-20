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
import { ArrowRight, MenuIcon } from "lucide-react";
import { memo, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { array } from "yup";
import * as math from 'mathjs'

export const Home = memo(function Home() {
    const feedback = useContext(FeedbackContext)

    const [queryVars, setQueryVars] = useSearchParams()
    const code = queryVars.get('code')

    const [trendingProducts, setTrendingProducts] = useState<Product[]>(undefined)
    const [popularProducts, setPopularProducts] = useState<Product[]>(undefined)

    const [open, setOpen] = useState(false)

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
                    setPopularProducts(r.data.slice(15, 28))
            })
            .catch(e => { feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') }); setTrendingProducts([]) })
    }

    // const maxDepth = 3
    // const errors = []
    // let isValid = true
    // function walk(n: math.MathNode, depth: number = 0) {
    //     if (depth > maxDepth) {
    //         isValid = false;
    //         errors.push('Expression too complex');
    //         return;
    //     }

    //     if (n.isSymbolNode) {
    //         const name = n.name;
    //         if (!allowedVars.includes(name)) {
    //             isValid = false;
    //             errors.push(`Disallowed variable: ${name}`);
    //         }
    //     }

    //     if (n?.isFunctionNode) {
    //         const name = n.fn.name;
    //         if (!allowedFuncs.includes(name)) {
    //             isValid = false;
    //             errors.push(`Disallowed function: ${name}`);
    //         }
    //     }

    //     // Recurse into children
    //     if (n.args) {
    //         n.args.forEach(arg => walk(arg, depth + 1));
    //     } else if (n.content) {
    //         walk(n.content, depth + 1);
    //     }
    // }

    useEffect(() => {
        // try {
        //     console.log('``````````````````````````````')
        //     console.log(math.evaluate('2+2*2'))
        //     console.log(math.parse('a+b+c'))
        //     // console.log(math.compile('a+b+c').evaluate({ a: 5, b: 7 }))
        //     const a = math.parser();
        //     const node = math.parse('3 * x + 2')
        //     console.log('node', node)
        //     node.forEach(function (node) {
        //         switch (node.type) {
        //             case 'OperatorNode':
        //                 console.log(node.type, node.op)
        //                 break
        //             case 'ConstantNode':
        //                 console.log(node.type, node.value)
        //                 break
        //             case 'SymbolNode':
        //                 console.log(node.type, node.name)
        //                 break
        //             default:
        //                 console.log(node.type)
        //         }
        //     })
        //     console.log('``````````````````````````````')
        // } catch (e) { console.error(e) }
        googleAuth()
        init()
    }, [])

    console.log('Home', { code })

    return (
        <Stack direction="vertical">
            <Button isIcon variant="text" onClick={() => setOpen(true)}><MenuIcon /></Button>
            <Navigation open={open} setOpen={setOpen} />
            {/* Trending */}
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

            {/* Popular */}
            <Stack direction="vertical" stackProps={{ className: 'border rounded-lg shadow-lg h-[11cm] p-2' }}>
                <Stack stackProps={{ className: 'justify-between items-center' }}>
                    <div className="text-3xl">{t('Home.popular')}</div>
                    <Button variant='text' size='sm'>{t('Home.viewAll')}<ArrowRight /></Button>
                </Stack>

                <div className="w-full overflow-x-auto overflow-y-visible flex-grow pb-4">
                    <Stack stackProps={{ className: 'items-start h-full justify-start w-max' }}>
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
    )
})
