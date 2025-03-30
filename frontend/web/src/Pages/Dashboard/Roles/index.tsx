import { Auth } from "@/src/Backend/Auth/Auth";
import { authFetch, authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { Modal } from "@/src/Components/Base/Modal";
import { Stack } from "@/src/Components/Base/Stack";
import { DataGrid } from "@/src/Components/DataGrid";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { ColorStatic } from "@/src/Lib/Colors/ColorStatic";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { EditIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { ComponentProps, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { array, string } from "yup";
import { CreateRole } from "./CreateRole";
import { UpdateRole } from "./UpdateRole";
import { Ask } from "@/src/Components/Ask";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";

export function Roles() {
    const privileges = useContext(AuthContext).privileges

    console.log('Roles')

    const feedback = useContext(FeedbackContext)!
    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    const navigate = useNavigate()

    let dataGridGradientColor = ColorStatic.parse(themeOptions.colors.primary[themeOptions.mode].main).toRgb()
    dataGridGradientColor.setAlpha(0.1)

    const createsRole = privileges?.find(f => f === 'create-role') !== undefined
    const updatesRole = privileges?.find(f => f === 'update-role') !== undefined
    const deletesRole = privileges?.find(f => f === 'delete-role') !== undefined
    const assignsRole = privileges?.find(f => f === 'assign-role') !== undefined

    const [loading, setLoading] = useState(true)

    const [rows, setRows] = useState([])

    const [editingRole, setEditingRole] = useState<string | undefined>(undefined)
    const [openCreateRoleModal, setOpenCreateRoleModal] = useState(false)
    const [openUpdateRoleModal, setOpenUpdateRoleModal] = useState(false)

    const [ask, setAsk] = useState<ComponentProps<typeof Ask>>(undefined)

    const [deletingRole, setDeletingRole] = useState<string | undefined>(undefined)
    const deleteRole = async (id, name) => {
        setDeletingRole(id)
        try {
            const r = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'delete', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } })
            if (!r.response?.ok) {
                feedback.push({ node: t('Roles.DeletionFailure'), color: { fgColor: 'error' } })
                return
            }

            await refresh()

            if (Auth.getRole() === name) {
                const r = await Auth.logout()

                if (!r)
                    feedback.push({ node: t('common.logoutFailed'), color: { fgColor: 'error' } })
                else
                    navigate('/')
            }
        } finally {
            setDeletingRole(undefined)
        }

    }

    const overWriteColumns: ColumnDef<any>[] = [
        {
            id: 'createdAt',
            accessorKey: 'createdAt',
            cell: ({ getValue }) => typeof getValue() === 'number' ? toFormat(getValue() as number, configuration.local, undefined, DATE) : '-',
        },
        {
            id: 'updatedAt',
            accessorKey: 'updatedAt',
            cell: ({ getValue }) => typeof getValue() === 'number' ? toFormat(getValue() as number, configuration.local, undefined, DATE) : '-',
        },
    ]

    const additionalColumns: ColumnDef<any>[] = (!createsRole && !updatesRole && !deletesRole && !assignsRole)
        ? []
        : [
            {
                id: 'actions',
                accessorKey: 'actions',
                cell: ({ row }) =>
                    <Stack stackProps={{ className: "justify-center w-full" }}>
                        {
                            updatesRole &&
                            <Button
                                isIcon
                                variant='text'
                                onClick={() => {
                                    setOpenUpdateRoleModal(true)
                                    setEditingRole(row.original._id)
                                }}
                            >
                                {editingRole === undefined || editingRole !== row.original._id ? <EditIcon /> : <CircularLoadingIcon />}
                            </Button>
                        }
                        {
                            deletesRole &&
                            <Button
                                isIcon
                                variant='text'
                                fgColor='error'
                                onClick={() => setAsk({ open: true, title: t('Roles.deletionTitle'), content: t('Roles.deletionContent'), successAction: () => deleteRole(row.original._id, row.original.name), failureAction: () => setAsk({ ...ask, open: false }) })}
                            >
                                {deletingRole === undefined || deletingRole !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                            </Button>
                        }
                    </Stack >
            }
        ]

    const refresh = async () => {
        await init()
    }

    const init = async () => {
        setLoading(true)
        try {
            const r = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'get', headers: { 'Accept': 'application/json' } })
            console.log('data', r.data)
            if (r.response.ok && array().required().strict(true).isValidSync(r.data))
                setRows(r.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <>
            <DataGrid
                configName='roles'
                containerProps={{ stackProps: { style: { backgroundImage: `linear-gradient(to bottom right, ${dataGridGradientColor.toHex()} , transparent)` } } }}
                data={rows.map(row => Object.fromEntries(Object.entries(row).filter(f => f[0] !== 'privileges')))}
                overWriteColumns={overWriteColumns}
                loading={loading}
                defaultColumnOrderModel={['actions']}
                additionalColumns={additionalColumns}
                appendHeaderNodes={[
                    <Button variant='outline' onClick={async () => await refresh()}><RefreshCwIcon />{t('Roles.Refresh')}</Button>,
                    createsRole &&
                    <Button
                        fgColor="success"
                        variant='outline'
                        onClick={() => { setOpenCreateRoleModal(true) }}
                    >
                        {editingRole === undefined ? <PlusIcon /> : <CircularLoadingIcon />}{t('Roles.Create')}
                    </Button>
                ]}
            />

            <Ask {...ask} onClose={() => setAsk({ ...ask, open: false })} />

            <Modal
                onClose={() => { setOpenCreateRoleModal(false) }}
                open={openCreateRoleModal}
            >
                <CreateRole
                    onFinish={async (shouldRefresh = true) => {
                        setOpenCreateRoleModal(false)
                        if (shouldRefresh)
                            await refresh()
                    }}
                />
            </Modal>

            <Modal
                onClose={() => { setOpenUpdateRoleModal(false); setEditingRole(undefined) }}
                open={openUpdateRoleModal}
            >
                <UpdateRole
                    editingRoleId={editingRole}
                    onFinish={async (shouldRefresh = true) => {
                        setOpenUpdateRoleModal(false)
                        setEditingRole(undefined)
                        if (shouldRefresh)
                            await refresh()
                    }}
                />
            </Modal>
        </>
    )
}
