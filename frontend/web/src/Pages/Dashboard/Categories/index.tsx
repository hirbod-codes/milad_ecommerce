import { fetchData, getApiUrl } from "@/src/Backend/helpers"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Stack } from "@/src/Components/Base/Stack"
import { useEffect, useState } from "react"
import { array } from "yup"
import { Category } from "./Category"
import { Category as CategoryType } from "./index.d"
import { Button } from "@/src/Components/Base/Button"
import { PlusIcon } from "lucide-react"
import { Modal } from "@/src/Components/Base/Modal"
import { CreateCategory } from "./CreateCategory"

export function Categories() {
    const [categories, setCategories] = useState<CategoryType[]>([])

    const [openCreateCategoryModal, setOpenCreateCategoryModal] = useState(false)

    const [loading, setLoading] = useState(true)

    console.log('Categories', { categories, loading })

    const init = () => {
        Promise.all([
            fetchData(`${getApiUrl()}/categories`),
        ])
            .then(r => {
                console.log('r', r)
                if (r[0].response && r[0]?.response?.ok && array().required().isValidSync(r[0].data))
                    setCategories(r[0]?.data)

                setLoading(false)
            })
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <>
            <Stack direction="vertical" stackProps={{ className: "border rounded-lg size-full p-2 items-center" }}>
                {loading
                    ? <Stack stackProps={{ className: 'size-full items-center justify-center' }}><CircularLoading size='lg' /></Stack>
                    : categories.filter(c => !c.parentCategory).map((c, i) =>
                        <Category key={i} category={c} allCategories={categories} refresh={init} />
                    )
                }

                <Button isIcon variant="text" fgColor="success" onClick={() => setOpenCreateCategoryModal(true)}><PlusIcon /></Button>
            </Stack>

            <Modal
                onClose={() => { setOpenCreateCategoryModal(false) }}
                open={openCreateCategoryModal}
            >
                <CreateCategory
                    onFinish={async (shouldRefresh = true) => {
                        setOpenCreateCategoryModal(false)
                        if (shouldRefresh)
                            init()
                    }}
                />
            </Modal>
        </>
    )
}
