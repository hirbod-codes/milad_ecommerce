import { ComponentProps, useContext } from "react";
import { createPortal } from "react-dom";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/src/shadcn/components/ui/accordion'
import { motion, MotionProps, AnimatePresence } from 'framer-motion'
import { Category as CategoryType } from "../../SearchCategory/index.d";
import { useNavigate } from "react-router";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";

export type NavigationProps = {
    open: boolean
    setOpen?: (open: boolean) => void
    containerProps?: ComponentProps<'div'> & MotionProps
}

export function Navigation({ open, setOpen, containerProps }: NavigationProps) {
    const configuration = useContext(ConfigurationContext)

    console.log('Navigation', { open, setOpen, containerProps })

    return (
        <>
            {
                createPortal(
                    <AnimatePresence>
                        {open &&
                            <motion.div
                                initial={{ x: '-100%' }}
                                exit={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                className="absolute top-0 z-[49] h-screen w-screen px-2"
                                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                            >
                                <div className='z-50 absolute top-0 left-0 bg-surface-container-high overflow-y-auto border rounded-lg h-full w-[5cm]' onClick={(e) => { e.stopPropagation(); }}>
                                    {configuration.categories && configuration.categories.length > 0 && configuration.categories.filter(f => !f.parentCategory).map((m, i) =>
                                        <Category key={m._id} category={m} allCategories={configuration.categories} />
                                    )}
                                </div>
                            </motion.div>
                        }
                    </AnimatePresence>
                    , document.body
                )
            }
        </>
    )
}

function Category({ category, allCategories }: { category: CategoryType, allCategories: CategoryType[] }) {
    const childrenCategories = allCategories.filter(f => f.parentCategory === category._id)

    const navigate = useNavigate()

    return (
        <div className="w-full px-2">
            {childrenCategories.length === 0
                ? <div className="cursor-pointer hover:underline py-2" onClick={() => navigate(`/Category?category=${category.name}`)}>{category.name}</div>
                : <Accordion type="single" collapsible className=''>
                    <AccordionItem value="item-1" className="border-0">
                        <AccordionTrigger className="py-2">
                            <div className="text-md" onClick={() => navigate(`/Category?category=${category.name}`)}>
                                {category.name}
                            </div>
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

