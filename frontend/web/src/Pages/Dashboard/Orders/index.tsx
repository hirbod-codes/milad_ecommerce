import { useContext } from "react";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { OrdersDataGrid } from "@/src/Components/Orders/OrdersDataGrid";

/**
 * Note: static fields of Product model is hard coded.
 * @returns 
 */
export function Orders() {
    const privileges = useContext(AuthContext).privileges

    const createsOrder = privileges?.find(f => f === 'create-order') !== undefined
    const updatesOrder = privileges?.find(f => f === 'update-order') !== undefined
    const deletesOrder = privileges?.find(f => f === 'delete-order') !== undefined

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
