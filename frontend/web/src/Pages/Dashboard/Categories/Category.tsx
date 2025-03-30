import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/src/shadcn/components/ui/accordion'
import { Category as CategoryType } from './index.d'
import { Modal } from '@/src/Components/Base/Modal'
import { ComponentProps, useContext, useState } from 'react'
import { CreateCategory } from './CreateCategory'
import { Stack } from '@/src/Components/Base/Stack'
import { Button } from '@/src/Components/Base/Button'
import { EditIcon, EyeIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { t } from 'i18next'
import { Ask } from '@/src/Components/Ask'
import { authFetchData, getApiUrl } from '@/src/Backend/helpers'
import { FeedbackContext } from '@/src/Contexts/Feedback/FeedbackContext'
import { CircularLoading } from '@/src/Components/Base/CircularLoading'
import { UpdateCategory } from './UpdateCategory'
import { ReadCategory } from './ReadCategory'
import { AuthContext } from '@/src/Contexts/Auth/AuthContext'

export function Category({ category, allCategories, refresh }: { category: CategoryType, allCategories: CategoryType[], refresh?: () => void }) {
    const privileges = useContext(AuthContext).privileges
    const feedback = useContext(FeedbackContext)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [openCreateCategoryModal, setOpenCreateCategoryModal] = useState(false)
    const [openReadCategoryModal, setOpenReadCategoryModal] = useState(false)
    const [openUpdateCategoryModal, setOpenUpdateCategoryModal] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const updateCategory = async (id: string) => {
        setDeleting(true)
        try {
            const r = await authFetchData(`${getApiUrl()}/categories`, { method: 'delete', body: JSON.stringify({ id }) })
            if (r.response && r.response.ok) {
                if (refresh)
                    refresh()
            } else
                feedback.push({ node: t('Category.deletionFailure'), color: { fgColor: 'error' } })
        } finally { setDeleting(false) }
    }

    const deleteCategory = async (id: string) => {
        setDeleting(true)
        try {
            const r = await authFetchData(`${getApiUrl()}/categories`, { method: 'delete', body: JSON.stringify({ id }) })
            if (r.response && r.response.ok) {
                if (refresh)
                    refresh()
            } else
                feedback.push({ node: t('Category.deletionFailure'), color: { fgColor: 'error' } })
        } finally { setDeleting(false) }
    }

    const createsCategory = privileges.find(f => f === 'create-category') !== undefined
    const updatesCategory = privileges.find(f => f === 'update-category') !== undefined
    const deletesCategory = privileges.find(f => f === 'delete-category') !== undefined

    return (
        <div className="w-full p-2">
            <Accordion type="single" collapsible className='w-full border rounded-lg p-2'>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <Stack stackProps={{ className: 'items-center justify-between w-full' }}>
                            {category.name}

                            <Stack>
                                <Button
                                    isIcon
                                    variant="text"
                                    size='xs'
                                    onClick={(e) => { e.stopPropagation(); setOpenReadCategoryModal(true) }}
                                >
                                    <EyeIcon />
                                </Button>

                                {updatesCategory &&
                                    <Button
                                        isIcon
                                        variant="text"
                                        size='xs'
                                        onClick={(e) => { e.stopPropagation(); setOpenUpdateCategoryModal(true) }}
                                    >
                                        <EditIcon />
                                    </Button>
                                }

                                {deletesCategory &&
                                    <Button
                                        isIcon
                                        variant="text"
                                        fgColor="error"
                                        size='xs'
                                        onClick={(e) => { e.stopPropagation(); setAsk({ open: true, title: t('Category.deletionTitle'), content: t('Category.deletionContent'), successAction: () => deleteCategory(category._id), failureAction: () => setAsk({ ...ask, open: false }) }) }}
                                    >
                                        {deleting ? <CircularLoading /> : <Trash2Icon />}
                                    </Button>
                                }
                            </Stack>
                        </Stack>
                    </AccordionTrigger>
                    <AccordionContent>
                        {allCategories.filter(f => f.parentCategory === category._id).map((child, i) =>
                            <Category key={i} category={child} allCategories={allCategories} />
                        )}

                        {createsCategory && <Button isIcon variant="text" fgColor="success" onClick={() => setOpenCreateCategoryModal(true)}><PlusIcon /></Button>}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

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

            <Modal
                onClose={() => { setOpenReadCategoryModal(false) }}
                open={openReadCategoryModal}
            >
                <ReadCategory category={category} />
            </Modal>

            <Modal
                onClose={() => { setOpenUpdateCategoryModal(false) }}
                open={openUpdateCategoryModal}
            >
                <UpdateCategory
                    categoryId={category._id}
                    onFinish={async (shouldRefresh = true) => {
                        setOpenUpdateCategoryModal(false)
                        if (shouldRefresh)
                            refresh()
                    }}
                />
            </Modal>

            <Ask {...ask} onClose={() => setAsk({ ...ask, open: false })} />
        </div>
    )
}

