import { Auth } from "@/src/Backend/Auth/Auth";
import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { Button } from "@/src/Components/Base/Button";
import { CircularLoadingIcon } from "@/src/Components/Base/CircularLoadingIcon";
import { Stack } from "@/src/Components/Base/Stack";
import { DataGrid } from "@/src/Components/DataGrid";
import { Navigation } from "@/src/Components/Navigation";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { ColorStatic } from "@/src/Lib/Colors/ColorStatic";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { EditIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { array, string } from "yup";

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
    const [openManageRoleModal, setOpenManageRoleModal] = useState(false)

    const [deletingRole, setDeletingRole] = useState<string | undefined>(undefined)
    const deleteRole = async (id) => {
        setDeletingRole(id)
        try { }
        finally {
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
                                    setEditingRole(row.original._id)
                                    setOpenManageRoleModal(true)
                                    setEditingRole(rows.find(u => u._id === row.original._id))
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
                                onClick={async () => {
                                    await deleteRole(row.original._id);
                                    await refresh()
                                    if (Auth.getRole() === row.original.name) {
                                        await Auth.logout()
                                        navigate('/')
                                    }
                                }}
                            >
                                {deletingRole === undefined || deletingRole !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                            </Button>
                        }
                    </Stack>
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
                const data = await authFetchData(`${getAuthApiUrl()}/privileges`, { method: 'get', headers: { 'Accept': 'application/json' } })
                if (!array().required().strict(true).of(string().required().strict(true)).isValidSync(data)) {
                    feedback.push({
                        node: t('privileges.getFailure')
                    })
                    return
                }

                for (const privilege of data)
                    if (privilege === 'create-role')
                        setCreatesRole(true)
                    else if (privilege === 'update-role')
                        setUpdatesRole(true)
                    else if (privilege === 'delete-role')
                        setDeletesRole(true)
                    else if (privilege === 'assign-role')
                        setAssignsRole(true)
            }

            const data = await authFetchData(`${getAuthApiUrl()}/roles`, { method: 'get', headers: { 'Accept': 'application/json' } })
            console.log('data', data)
            if (array().required().strict(true).isValidSync(data))
                setRows(data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <>
            {/* <div className="w-[64px] h-full">
                <Navigation />
            </div> */}

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
                        onClick={() => { setOpenManageRoleModal(true) }}
                    >
                        {editingRole === undefined ? <PlusIcon /> : <CircularLoadingIcon />}{t('Roles.Create')}
                    </Button>
                ]}
            />
        </>
    )
}
