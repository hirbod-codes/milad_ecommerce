import { useContext } from "react";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { OrdersDataGrid } from "@/src/Components/Orders/OrdersDataGrid";

/**
 * Note: static fields of Product model is hard coded.
 * @returns 
 */
export function Orders() {
    const privileges = useContext(AuthContext).privileges

    const createsOrder = privileges?.find(f => f === 'create-product') !== undefined
    const updatesOrder = privileges?.find(f => f === 'update-product') !== undefined
    const deletesOrder = privileges?.find(f => f === 'delete-product') !== undefined

    return (
        <OrdersDataGrid
            dataGridProps={{
                configName: 'Orders',
                defaultColumnVisibilityModel: { _id: false },
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
