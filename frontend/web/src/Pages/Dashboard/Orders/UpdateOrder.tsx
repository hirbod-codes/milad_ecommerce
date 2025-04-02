import { useContext, useEffect, useRef, useState } from "react";
import { authFetchData, fetchData, getApiUrl } from "@/src/Backend/helpers";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { t } from "i18next";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { array } from "yup";
import { Button } from "@/src/Components/Base/Button";
import { EyeIcon } from "lucide-react";
import { Stack } from "@/src/Components/Base/Stack";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { CheckBox } from "@/src/Components/Base/CheckBox";
import { Modal } from "@/src/Components/Base/Modal";
import { Product } from "../Products/index.d";
import { CircularLoading } from "@/src/Components/Base/CircularLoading";
import { Input } from "@/src/Components/Base/Input";
import { Textarea } from "@/src/shadcn/components/ui/textarea";
import { Order } from "./index.d";

export function UpdateOrder({ order: orderInput, onFinish }: { order?: Order, onFinish?: (shouldRefresh: boolean) => void }) {
    const feedback = useContext(FeedbackContext)!
    const configuration = useContext(ConfigurationContext)!

    const [order, setOrder] = useState(orderInput)

    const [showProducts, setShowProducts] = useState(false)
    const [fetchedProducts, setFetchedProducts] = useState<Product[]>(undefined)
    const [loadingProducts, setLoadingProducts] = useState(true)

    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        if (showProducts !== undefined) {
            setLoadingProducts(true);
            (async () => {
                const r = await fetchData(`${getApiUrl()}/products?ids=${order?.products?.map(m => m.productId)?.join(',')}`)
                if (!r.response || !r.response.ok || !array().required().isValidSync(r?.data)) {
                    feedback.push({ node: t('Orders.getProductsFailure') })
                    setFetchedProducts(undefined)
                } else
                    setFetchedProducts(r.data)
            })()
                .finally(() => setLoadingProducts(false))
        }
    }, [showProducts])

    return (
        <>
            {order === undefined
                ? t('common.NotFound')
                : <Stack direction="vertical">
                    <CheckBox label={t('UpdateOrder.isPayed')} inputProps={{ checked: order.isPayed, onChange: (e) => setOrder({ ...order, isPayed: e.target.checked }) }} />

                    <CheckBox label={t('UpdateOrder.isSent')} inputProps={{ checked: order.isSent, onChange: (e) => setOrder({ ...order, isSent: e.target.checked }) }} />

                    <Input label={t('UpdateOrder.cost')} labelId={t('UpdateOrder.cost')} value={order.cost?.IRR ?? '-'} readOnly />

                    <Button variant="outline" onClick={() => setShowProducts(true)}>
                        {t('UpdateOrder.showProducts')}
                        <EyeIcon />
                    </Button>

                    <Textarea value={order?.address.text ? order?.address.text ?? '' : ''} onChange={(e) => setOrder({ ...order, address: { ...order?.address, text: e.target.value.trim() } })} />

                    <Button
                        onClick={async () => {
                            setUpdating(true)
                            try {
                                const data = { orderId: order._id, order: { address: order.address } }
                                const r = await authFetchData(`${getApiUrl()}/orders`, { method: 'PATCH', body: JSON.stringify(data) })
                                if (!r.response || !r.response.ok)
                                    feedback.push({ node: t('UpdateOrder.updateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                else
                                    feedback.push({ node: t('UpdateOrder.updateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } })

                                if (onFinish)
                                    onFinish(true)
                            } finally { setUpdating(false) }
                        }}
                    >
                        {updating ? <CircularLoadingIcon /> : t('UpdateOrder.update')}
                    </Button>
                </Stack>
            }

            <Modal
                modalContainerProps={{ className: 'overflow-y-auto' }}
                open={showProducts}
                onClose={() => setShowProducts(false)}
            >
                <Stack direction="vertical">
                    {
                        loadingProducts
                            ? <CircularLoading />
                            : (
                                fetchedProducts === undefined
                                    ? t('common.NoData')
                                    : fetchedProducts.map((m, i) =>
                                        <div key={i}>{m.displayName[configuration.local.language]}</div>
                                    )
                            )
                    }
                </Stack>
            </Modal>
        </>
    )
}
