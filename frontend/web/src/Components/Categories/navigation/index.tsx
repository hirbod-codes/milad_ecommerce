import { ComponentProps, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/src/shadcn/components/ui/accordion'
import { MenuIcon } from "lucide-react";
import { Button } from "../../Base/Button";
import { cn } from "@/src/shadcn/lib/utils";
import { useAnimate, motion, MotionProps } from 'framer-motion'
import { fetchData, getApiUrl } from "@/src/Backend/helpers";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { t } from "i18next";
import { Category as CategoryType } from "../../SearchCategory/index.d";
import { array } from "yup";
import { Stack } from "../../Base/Stack";
import { Navigate, useNavigate } from "react-router";

export type NavigationProps = {
    containerProps?: ComponentProps<'div'> & MotionProps
}

export function Navigation({ containerProps }: NavigationProps) {
    const feedback = useContext(FeedbackContext)

    const [openMenu, setOpenMenu] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const [scope, animate] = useAnimate()
    const [show, setShow] = useState(false)

    const [categories, setCategories] = useState<CategoryType[]>(undefined)

    const handleAnimation = async () => {
        if (scope.current) {
            setShow(false)
            if (openMenu) {
                await animate(scope.current, { x: '0%' })
                setShow(true)
            }
            else {
                await animate(scope.current, { x: '-100%' })
                setShow(true)
            }
        }
    }
    useEffect(() => {
        handleAnimation()
    }, [openMenu])

    const init = async () => {
        fetchData(`${getApiUrl()}/categories`)
            .then(r => {
                if (!r.response || !r.response.ok || !array().required().isValidSync(r.data))
                    feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') })
                else
                    setCategories(r.data)
            })
            .catch(e => feedback.pushError({ node: t('CategoriesNavigation.failedToFetchCategories') }))
    }

    useEffect(() => {
        function close(e: PointerEvent) {
            if (!scope.current)
                return

            const r = scope.current.getBoundingClientRect()

            if (e.clientX > r.right || e.clientX < r.left || e.clientY > r.bottom || e.clientY < r.top)
                setOpenMenu(false)
        }

        window.addEventListener('pointerdown', close)

        init()

        return () => window.removeEventListener('pointerdown', close)
    }, [])

    console.log('Navigation', { openMenu, containerRef: containerRef.current, scope: scope.current, categories })

    return (
        <>
            <Button isIcon variant="text" onClick={() => { if (categories && categories.length > 0) setOpenMenu(true) }}><MenuIcon /></Button>
            {
                createPortal(
                    <>
                        <motion.div ref={scope} initial={{ x: '-100%' }} {...containerProps} className={cn('absolute top-0 h-screen w-[5cm] bg-surface-container-high text-surface-foreground shadow-lg', containerProps?.className)}>
                            {show && categories && categories.length > 0 && categories.filter(f => !f.parentCategory).map((m, i) =>
                                <Category key={m._id} category={m} allCategories={categories} />
                            )}
                        </motion.div>
                    </>
                    , document.body)
            }
        </>
    )
}

export function Category({ category, allCategories }: { category: CategoryType, allCategories: CategoryType[] }) {
    const childrenCategories = allCategories.filter(f => f.parentCategory === category._id)

    const navigate = useNavigate()

    return (
        <div className="w-full px-2">
            {childrenCategories.length === 0
                ? <div className="cursor-pointer hover:underline py-2" onClick={() => navigate(`/products?category=${category._id}`)}>{category.name}</div>
                : <Accordion type="single" collapsible className=''>
                    <AccordionItem value="item-1" className="border-0">
                        <AccordionTrigger className="py-2" onClick={() => navigate(`/products?category=${category._id}`)}>
                            {category.name}
                        </AccordionTrigger>
                        <AccordionContent>
                            {childrenCategories.map(c => <Category key={category._id} category={c} allCategories={allCategories} />)}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            }
        </div>
    )
}

