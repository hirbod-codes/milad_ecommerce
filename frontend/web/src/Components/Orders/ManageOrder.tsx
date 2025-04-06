import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CheckBox } from "@/src/Components/Base/CheckBox"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { t } from "i18next"
import { useContext, useEffect, useRef, useState } from "react"
import { string } from "yup"
import { Order, staticFields } from "."
import { Modal } from "../Base/Modal"
import { SearchUser } from "../SearchUser"
import { ProductsDataGrid } from "../Products/ProductsDataGrid"
import { Product } from "../Products"
import { Row } from "@tanstack/react-table"

export function ManageOrder({ order: orderInput, onFinish }: { order?: Order, onFinish?: (order: Order, hasChanged: boolean) => void }) {
    const feedback = useContext(FeedbackContext)

    const [user, setUser] = useState(undefined)

    const [order, setOrder] = useState<Order | undefined>(orderInput)

    const [loading, setLoading] = useState<boolean>(false)
    const [submitting, setSubmitting] = useState<boolean>(false)

    const [showChooseProductModal, setShowChooseProductModal] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<{ [k: string]: { row: Row<Product>, quantity: number } }>({})

    // console.log('ManageOrder', { order, loading, submitting })

    useEffect(() => {
        // Promise.all([
        // ])
        //     .then(async r => {
        //         const ps = r[0]
        //         if (r[0].ok)
        //         setLoading(false)
        //     })
    }, [])

    return (
        loading
            ? <Stack stackProps={{ className: 'items-center justify-center' }}><CircularLoading /></Stack>
            : <Stack direction="vertical" stackProps={{ className: 'mt-4 h-max' }}>
                {orderInput === undefined
                    ? <h5 className="text-center text-xl">{t('ManageOrder.createOrder')}</h5>
                    : <h5 className="text-center text-xl">{t('ManageOrder.updateOrder')}</h5>
                }

                <Separator />

                {orderInput &&
                    <SearchUser
                        onSelect={(user) => setUser(user)}
                    />
                }

                <Separator />

                {/* First Row */}
                <Button onClick={() => setShowChooseProductModal(true)}>{t('ManageOrder.ChooseProducts')}</Button>
                <Modal
                    modalContainerProps={{ className: 'h-[15cm]' }}
                    open={showChooseProductModal}
                    onClose={() => setShowChooseProductModal(false)}
                >
                    <ProductsDataGrid
                        dataGridProps={{
                            configName: 'OrderProductsList',
                            defaultColumnVisibilityModel: { _id: false },
                            defaultColumnOrderModel: ['actions', 'name', 'displayName', 'isAvailable', 'price'],
                            containerProps: { stackProps: { className: 'w-full' } },
                        }}
                        columns={{
                            additionalColumns: [
                                {
                                    id: 'quantity',
                                    header(props) {
                                        return t('Columns.qnt')
                                    },
                                    cell: ({ row, cell }) =>
                                        <div className="w-full flex flex-row justify-center">
                                            <Input
                                                containerProps={{ className: 'w-fit' }}
                                                type="number"
                                                value={selectedProducts[row.original._id]?.quantity ?? 0}
                                                onChange={(e) => {
                                                    if (e.target.valueAsNumber > 0)
                                                        setSelectedProducts({ ...selectedProducts, [row.original._id]: { row, quantity: e.target.valueAsNumber } })
                                                    else
                                                        setSelectedProducts(Object.fromEntries(Object.entries(selectedProducts).filter(f => f[0] !== row.original._id)))
                                                }}
                                            />
                                        </div>
                                }
                            ]
                        }}
                        functionality={{
                            search: true,
                            pagination: true,
                            filter: true,
                            sort: true
                        }}
                    />
                </Modal>

                <Separator />

                <Button
                    disabled={submitting}
                    onClick={async () => {
                        setSubmitting(true)
                        try {
                            if (orderInput !== undefined) {
                                const data: any = {
                                    id: order._id,
                                    order,
                                }
                                console.log('data', data)

                                const r = await authFetchData(`${getApiUrl()}/orders`, { method: 'PATCH', body: JSON.stringify(data) })
                                if (!r.response || !r.response?.ok)
                                    feedback.push({ node: t('ManageOrder.UpdateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })

                                feedback.push({ node: t('ManageOrder.UpdateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } })
                            } else {
                                const r = await authFetchData(`${getApiUrl()}/orders`, { method: 'POST', body: JSON.stringify(order) })
                                if (!r.response || !r.response?.ok || !string().required().isValidSync(r?.data?.id))
                                    feedback.push({ node: t('ManageOrder.CreateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })

                                feedback.push({ node: t('ManageOrder.CreateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } })
                            }
                        } finally { setSubmitting(false) }
                    }}
                >
                    {submitting ? <CircularLoading /> : t('ManageOrder.Update')}
                </Button>
            </Stack>
    )
}
