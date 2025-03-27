import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/src/shadcn/components/ui/accordion'
import { Category as CategoryType } from './index.d'
import { Modal } from '@/src/Components/Base/Modal'
import { ComponentProps, useContext, useState } from 'react'
import { CreateCategory } from './CreateCategory'
import { Stack } from '@/src/Components/Base/Stack'
import { Button } from '@/src/Components/Base/Button'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { t } from 'i18next'
import { Ask } from '@/src/Components/Ask'
import { authFetchData, getApiUrl } from '@/src/Backend/helpers'
import { FeedbackContext } from '@/src/Contexts/Feedback/FeedbackContext'

export function Category({ category, allCategories, refresh }: { category: CategoryType, allCategories: CategoryType[], refresh?: () => void }) {
    const feedback = useContext(FeedbackContext)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [openCreateCategoryModal, setOpenCreateCategoryModal] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const deleteCategory = async (id: string) => {
        setDeleting(true)
        try {
            const r = await authFetchData(`${getApiUrl()}/categories`, { method: 'delete', body: JSON.stringify({ id }) })
            if (r.response && r.response.ok) {
                if (refresh)
                    refresh()
            } else
                feedback.push({ node: t('Category.deletionFailure') })
        } finally { setDeleting(false) }
    }

    return (
        <div className="w-full p-2">
            <Accordion type="single" collapsible className='w-full border rounded-lg p-2'>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <Stack stackProps={{ className: 'items-center justify-between w-full' }}>
                            {category.name}

                            <Button
                                isIcon
                                variant="text"
                                fgColor="error"
                                size='xs'
                                onClick={(e) => { e.stopPropagation(); setAsk({ open: true, title: t('Category.deletionTitle'), content: t('Category.deletionContent'), successAction: () => deleteCategory(category._id), failureAction: () => setAsk({ ...ask, open: false }) }) }}
                            >
                                <Trash2Icon />
                            </Button>
                        </Stack>
                    </AccordionTrigger>
                    <AccordionContent>
                        {allCategories.filter(f => f.parentCategory === category._id).map((child, i) =>
                            <Category key={i} category={child} allCategories={allCategories} />
                        )}

                        <div className="text-center">
                            <Button isIcon variant="text" fgColor="success" onClick={() => setOpenCreateCategoryModal(true)}><PlusIcon /></Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Ask {...ask} onClose={() => setAsk({ ...ask, open: false })} />

            <Modal
                onClose={() => { setOpenCreateCategoryModal(false) }}
                open={openCreateCategoryModal}
            >
                <CreateCategory
                    parentCategoryId={category._id}
                    onFinish={async (shouldRefresh = true) => {
                        setOpenCreateCategoryModal(false)
                        if (shouldRefresh)
                            refresh()
                    }}
                />
            </Modal>
        </div>
    )
}

