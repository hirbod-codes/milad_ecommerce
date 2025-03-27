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

export function Roles({ privileges }: { privileges?: string[] }) {
    console.log('Roles')

    const feedback = useContext(FeedbackContext)!
    const configuration = useContext(ConfigurationContext)!
    const themeOptions = configuration.themeOptions

    const navigate = useNavigate()

    let dataGridGradientColor = ColorStatic.parse(themeOptions.colors.primary[themeOptions.mode].main).toRgb()
    dataGridGradientColor.setAlpha(0.1)

    const [createsRole, setCreatesRole] = useState(privileges?.find(f => f === 'create-role') !== undefined ? true : false)
    const [updatesRole, setUpdatesRole] = useState(privileges?.find(f => f === 'update-role') !== undefined ? true : false)
    const [deletesRole, setDeletesRole] = useState(privileges?.find(f => f === 'delete-role') !== undefined ? true : false)
    const [assignsRole, setAssignsRole] = useState(privileges?.find(f => f === 'assign-role') !== undefined ? true : false)

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
                feedback.push({ node: t('Roles.DeletionFailure') })
                return
            }

            await refresh()

            if (Auth.getRole() === name) {
                const r = await Auth.logout()

                if (!r)
                    feedback.push({ node: t('common.logoutFailed') })
                else
                    navigate('/')
            }
        } finally {
            setDeletingRole(undefined)
        }

    }

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
        console.log('init')

        setLoading(true)
        try {
            if (!privileges) {
                const r = await authFetchData(`${getAuthApiUrl()}/privileges`, { method: 'get', headers: { 'Accept': 'application/json' } })
                if (!r.response?.ok || !array().required().strict(true).of(string().required().strict(true)).isValidSync(r?.data)) {
                    feedback.push({
                        node: t('privileges.getFailure')
                    })
                    return
                }

                for (const privilege of r.data)
                    if (privilege === 'create-role')
                        setCreatesRole(true)
                    else if (privilege === 'update-role')
                        setUpdatesRole(true)
                    else if (privilege === 'delete-role')
                        setDeletesRole(true)
                    else if (privilege === 'assign-role')
                        setAssignsRole(true)
            }

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
                // overWriteColumns={columns}
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
