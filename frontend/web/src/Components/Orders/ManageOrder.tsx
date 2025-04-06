import { authFetchData, formatCurrency, getApiUrl } from "@/src/Backend/helpers"
import { Button } from "@/src/Components/Base/Button"
import { CheckBox } from "@/src/Components/Base/CheckBox"
import { CircularLoading } from "@/src/Components/Base/CircularLoading"
import { Input } from "@/src/Components/Base/Input"
import { Stack } from "@/src/Components/Base/Stack"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Separator } from "@/src/shadcn/components/ui/separator"
import { t } from "i18next"
import { useContext, useEffect, useState } from "react"
import { string } from "yup"
import { Order } from "."
import { Modal } from "../Base/Modal"
import { SearchUser } from "../SearchUser"
import { ProductsDataGrid } from "../Products/ProductsDataGrid"
import { Product } from "../Products"
import { Row } from "@tanstack/react-table"
import { RefreshCwIcon } from "lucide-react"
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext"
import { Textarea } from "@/src/shadcn/components/ui/textarea"

export function ManageOrder({ order: orderInput, onFinish }: { order?: Order, onFinish?: (order: Order, hasChanged: boolean) => void }) {
    const configuration = useContext(ConfigurationContext)
    const feedback = useContext(FeedbackContext)

    const [user, setUser] = useState(undefined)

    const [order, setOrder] = useState<Order | undefined>(orderInput)

    const [loading, setLoading] = useState<boolean>(false)
    const [submitting, setSubmitting] = useState<boolean>(false)

    const [showChooseProductModal, setShowChooseProductModal] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<{ [k: string]: { row: Row<Product>, quantity: number } }>({})

    console.log('ManageOrder', { user, order, loading, submitting, showChooseProductModal, selectedProducts, })

    useEffect(() => {
        if (Object.entries(selectedProducts).length > 0)
            setOrder({
                ...order,
                cost: {
                    IRR: Object.entries(selectedProducts).map(m => m[1]).reduce((p, c) => p + (c.quantity * c.row.original.price.IRR), 0),
                    USD: Object.entries(selectedProducts).map(m => m[1]).reduce((p, c) => p + (c.quantity * c.row.original.price.USD), 0),
                }
            })
        else
            setOrder({ ...order, cost: undefined })
    }, [selectedProducts])

    return (
        loading
            ? <Stack stackProps={{ className: 'items-center justify-center' }}><CircularLoading /></Stack>
            : <Stack direction="vertical" stackProps={{ className: 'mt-4 h-max' }}>
                {orderInput === undefined
                    ? <h5 className="text-center text-xl">{t('ManageOrder.createOrder')}</h5>
                    : <h5 className="text-center text-xl">{t('ManageOrder.updateOrder')}</h5>
                }

                <Separator />

                <div className="rounded-lg border p-4 my-4">
                    <div className="text-lg text-center pb-4">{t('ManageOrder.SearchUser')}</div>
                    <Input
                        label={t('ManageOrder.ChosenUser')}
                        className="w-full"
                        innerContainerProps={{ className: 'w-full' }}
                        labelId={t('ManageOrder.ChosenUser')}
                        value={order?.userId}
                        disabled
                        endIcon={orderInput !== undefined ? undefined : <RefreshCwIcon onClick={(e) => { e.stopPropagation(); setOrder({ ...order, userId: undefined }) }} />}
                    />

                    {orderInput === undefined &&
                        <SearchUser onSelect={(user) => { setUser(user); setOrder({ ...order, userId: user._id }) }} />
                    }
                </div>


                <Button variant='outline' onClick={() => setShowChooseProductModal(true)}>{t('ManageOrder.ChooseProducts')}</Button>
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


                {order?.cost?.IRR !== undefined &&
                    <div className="text-md">
                        {formatCurrency(configuration, order?.cost?.IRR)}
                    </div>
                }

                {order?.cost?.USD !== undefined &&
                    <div className="text-md">
                        {formatCurrency(configuration, order?.cost?.USD)}
                    </div>
                }

                <CheckBox
                    containerProps={{ className: 'w-fit' }}
                    colorForeground='success'
                    label={t('ManageOrder.isSent')}
                    inputProps={{
                        checked: order?.isSent ?? false,
                        onChange: () => setOrder({ ...order, isSent: !(order?.isSent ?? false) })
                    }}
                />

                <CheckBox
                    containerProps={{ className: 'w-fit' }}
                    colorForeground='success'
                    label={t('ManageOrder.isPayed')}
                    inputProps={{
                        checked: order?.isPayed ?? false,
                        onChange: () => setOrder({ ...order, isPayed: !(order?.isPayed ?? false) })
                    }}
                />

                <Textarea
                    placeholder={t('ManageOrder.address')}
                    value={order?.address?.text ?? ''}
                    onChange={(e) => setOrder({ ...order, address: { ...order?.address, text: e.target.value.trim() } })}
                />

                <Button
                    disabled={submitting}
                    onClick={async () => {
                        setSubmitting(true)
                        try {
                            if (orderInput !== undefined) {
                                const data: any = {
                                    id: order?._id,
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
