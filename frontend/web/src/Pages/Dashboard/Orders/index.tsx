import { useContext, useState } from "react";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { OrdersDataGrid } from "@/src/Components/Orders/OrdersDataGrid";
import { Tabs } from "@/src/Components/Base/Tabs";
import { t } from "i18next";
import { Button } from "@/src/Components/Base/Button";

/**
 * Note: static fields of Product model is hard coded.
 * @returns 
 */
export function Orders() {
    const privileges = useContext(AuthContext).privileges

    const readsOrder = privileges?.find(f => f === 'get-order') !== undefined
    const createsOrder = privileges?.find(f => f === 'create-order') !== undefined
    const updatesOrder = privileges?.find(f => f === 'update-order') !== undefined
    const deletesOrder = privileges?.find(f => f === 'delete-order') !== undefined

    const readsOrderSelf = privileges?.find(f => f === 'get-order-self') !== undefined
    const createsOrderSelf = privileges?.find(f => f === 'create-order-self') !== undefined
    const updatesOrderSelf = privileges?.find(f => f === 'update-order-self') !== undefined
    const deletesOrderSelf = privileges?.find(f => f === 'delete-order-self') !== undefined

    const [index, setIndex] = useState(0)

    const tabs = [], tabContents = []

    if (readsOrder) {
        tabs.push({ node: <Button variant={index === 0 ? 'outline' : 'text'}>{t('orders.usersOrders')}</Button>, props: { className: 'cursor-pointer' } })
        tabContents.push(
            <OrdersDataGrid
                mode='others'
                dataGridProps={{
                    configName: 'Orders',
                    defaultColumnVisibilityModel: { _id: false, userId: false, schemaVersion: false },
                    defaultColumnOrderModel: ['actions', 'name', 'displayName', 'privileges']
                }}
                functionality={{
                    create: createsOrder,
                    update: updatesOrder,
                    delete: deletesOrder,
                    filter: true,
                    sort: true,
                    search: true,
                    pagination: true,
                }}
            />
        )
    }

    if (readsOrderSelf) {
        tabs.push({ node: <Button variant={index === 1 ? 'outline' : 'text'}>{t('orders.yourOrders')}</Button>, props: { className: 'cursor-pointer' } })
        tabContents.push(
            <OrdersDataGrid
                dataGridProps={{
                    configName: 'Orders',
                    defaultColumnVisibilityModel: { _id: false, userId: false, schemaVersion: false },
                    defaultColumnOrderModel: ['actions', 'name', 'displayName', 'privileges']
                }}
                functionality={{
                    create: createsOrderSelf,
                    update: updatesOrderSelf,
                    delete: deletesOrderSelf,
                    filter: true,
                    sort: true,
                    search: true,
                    pagination: true,
                }}
            />
        )
    }

    return (
        <Tabs
            tabs={tabs}
            tabContents={tabContents}
            defaultTab={0}
            onActiveTabChange={setIndex}
            containerProps={{ stackProps: { className: 'size-full' } }}
        />
    )
}
