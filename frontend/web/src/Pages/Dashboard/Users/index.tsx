import { useContext } from "react";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { UsersDataGrid } from "@/src/Components/Users/UserDataGrid";

/**
 * Note: static fields of Product model is hard coded.
 * @returns 
 */
export function Users() {
    const privileges = useContext(AuthContext).privileges

    const createsUser = privileges?.find(f => f === 'create-user') !== undefined
    const updatesUser = privileges?.find(f => f === 'update-user') !== undefined
    const deletesUser = privileges?.find(f => f === 'delete-user') !== undefined

    return (
        <UsersDataGrid
            dataGridProps={{
                configName: 'Users',
                defaultColumnVisibilityModel: { _id: false },
                defaultColumnOrderModel: ['firstName', 'lastName', 'username', 'phoneNumber', 'email']
            }}
            functionality={{
                create: createsUser,
                update: updatesUser,
                delete: deletesUser,
                filter: true,
                sort: true,
                search: true,
                pagination: true,
            }}
        />
    )
}
