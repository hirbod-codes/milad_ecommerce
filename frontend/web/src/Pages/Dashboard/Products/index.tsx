import { useContext } from "react";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { ProductsDataGrid } from "@/src/Components/Products/ProductsDataGrid";

/**
 * Note: static fields of Product model is hard coded.
 * @returns 
 */
export function Products() {
    const privileges = useContext(AuthContext).privileges

    const createsProduct = privileges?.find(f => f === 'create-product') !== undefined
    const updatesProduct = privileges?.find(f => f === 'update-product') !== undefined
    const deletesProduct = privileges?.find(f => f === 'delete-product') !== undefined

    return (
        <ProductsDataGrid
            dataGridProps={{
                configName: 'Products',
                defaultColumnVisibilityModel: { _id: false },
                defaultColumnOrderModel: ['actions', 'name', 'displayName', 'privileges']
            }}
            functionality={{
                create: createsProduct,
                update: updatesProduct,
                delete: deletesProduct,
                filter: true,
                sort: true,
                search: true,
                pagination: true,
            }}
        />
    )
}
