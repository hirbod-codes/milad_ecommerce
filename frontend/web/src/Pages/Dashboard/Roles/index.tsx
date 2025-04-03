import { useContext } from "react";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { RolesDataGrid } from "@/src/Components/Roles/RolesDataGrid";

export function Roles() {
    const privileges = useContext(AuthContext).privileges

    const feedback = useContext(FeedbackContext)!

    const createsRole = privileges?.find(f => f === 'create-role') !== undefined
    const updatesRole = privileges?.find(f => f === 'update-role') !== undefined
    const deletesRole = privileges?.find(f => f === 'delete-role') !== undefined
    const assignsRole = privileges?.find(f => f === 'assign-role') !== undefined

    return (
        <RolesDataGrid
            dataGridProps={{
                configName: 'Roles',
                defaultColumnVisibilityModel: { _id: false },
                defaultColumnOrderModel: ['actions', 'name', 'displayName', 'privileges']
            }}
            functionality={{
                create: createsRole,
                update: updatesRole,
                delete: deletesRole,
            }}
        />
    )
}
