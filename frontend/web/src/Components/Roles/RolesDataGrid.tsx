import { ComponentProps, ReactNode, useContext, useEffect, useReducer, useState } from "react";
import { Role } from ".";
import { authFetchData, getAuthApiUrl } from "@/src/Backend/helpers";
import { array } from "yup";
import { t } from "i18next";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { DataGrid } from "../DataGrid";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Stack } from "../Base/Stack";
import { Button } from "../Base/Button";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { EditIcon, EyeIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { CircularLoadingIcon } from "../Base/CircularLoadingIcon";
import { Ask } from "../Ask";
import { Auth } from "@/src/Backend/Auth/Auth";
import { useNavigate } from "react-router";
import { Modal } from "../Base/Modal";
import { CreateRole } from "@/src/Pages/Dashboard/Roles/CreateRole";
import { UpdateRole } from "@/src/Pages/Dashboard/Roles/UpdateRole";
import { ManageRole } from "./ManageRole";

export type DataGridProps = {
    roles?: Role[]
    afterDAtaFetchHook?: (roles: Role[]) => Role[]
    allFunctionalitiesToggle?: boolean
    functionality?: {
        search?: boolean
        select?: boolean
        filter?: boolean
        sort?: boolean
        create?: boolean
        update?: boolean
        delete?: boolean
        pagination?: boolean
    }
    options?: {
        appendDefaults?: boolean
        appendDefaultOverWriteColumns?: boolean
        defaultOverWriteColumns?: ColumnDef<any>[]
        appendDefaultAdditionalColumns?: boolean
        defaultAdditionalColumns?: ColumnDef<any>[]
        appendDefaultHeaderNodes?: boolean
    }
    columns?: {
        additionalColumns: ColumnDef<any>[]
        overWriteColumns: ColumnDef<any>[]
    }
    headerNodes?: ReactNode[]
    onChange?: (roles: Role[]) => void
    dataGridProps?: Omit<ComponentProps<typeof DataGrid>, 'data'>
}

export function RolesDataGrid({
    roles: inputRoles = [],
    afterDAtaFetchHook,
    allFunctionalitiesToggle = false,
    functionality,
    options = {
        appendDefaults: true,
        appendDefaultOverWriteColumns: true,
        appendDefaultAdditionalColumns: true,
        appendDefaultHeaderNodes: true,
    },
    columns = {
        additionalColumns: [],
        overWriteColumns: [],
    },
    headerNodes,
    onChange,
    dataGridProps
}: DataGridProps) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const navigate = useNavigate()

    const [roles, setRoles] = useState<Role[]>(inputRoles)

    if (!functionality)
        functionality = {}

    for (const p of ['search', 'select', 'filter', 'sort', 'create', 'update', 'delete', 'pagination'])
        if ((allFunctionalitiesToggle === true && functionality[p] !== false) || (allFunctionalitiesToggle === false && functionality[p] === true))
            functionality[p] = true
        else
            functionality[p] = false

    const init = async (offset: number = 0, limit: number = 0) => {
        setLoading(true)
        try {
            if (roles.length === 0) {
                const r = await authFetchData(`${getAuthApiUrl()}/roles`)
                if (!r.response || !r.response.ok || !array().required().isValidSync(r.data)) {
                    feedback.push({ node: t('RolesDataGrid.failedToFetchedRoles'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                    return false
                }

                if (afterDAtaFetchHook)
                    setRoles(afterDAtaFetchHook(r.data))
                else
                    setRoles(r.data)

                return true
            }
        } finally { setLoading(false) }
    }

    const [state, dispatch] = useReducer<{
        additionalColumns: ColumnDef<any>[],
        overWriteColumns: ColumnDef<any>[],
        headerNodes: ReactNode[],
        searchedRoles: Role[],
        searching: boolean,
        creating: boolean,
        updatingRow: Row<any> | undefined,
        deletingRow: Row<any> | undefined,
        ask: ComponentProps<typeof Ask>,
        page: { limit: number, offset: number },
        showPrivileges: Row<any> | undefined,
    }, { operation: string, data: any }, any>(
        (state, { operation, data }) => {
            switch (operation) {
                case 'createStarted':
                    return {
                        ...state,
                        creating: true
                    }

                case 'createEnded':
                    init()
                    return {
                        ...state,
                        creating: false
                    }

                case 'updateStarted':
                    return {
                        ...state,
                        updatingRow: data
                    }

                case 'updateEnded':
                    init()
                    return {
                        ...state,
                        updatingRow: undefined
                    }

                case 'deleteStarted':
                    return {
                        ...state,
                        deletingRow: data,
                        ask: {
                            open: true,
                            title: t('Roles.deletionTitle'),
                            content: t('Roles.deletionContent'),
                            successAction: () =>
                                authFetchData(`${getAuthApiUrl()}/roles`, { method: 'delete', body: JSON.stringify({ id: data.original._id }), headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } })
                                    .then(async r => {
                                        if (!r.response?.ok) {
                                            feedback.push({ node: t('Roles.DeletionFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                            return
                                        }

                                        await init()

                                        if (Auth.getRole() === data.original.name) {
                                            const r = await Auth.logout()

                                            if (!r)
                                                feedback.push({ node: t('common.logoutFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                            else
                                                navigate('/')
                                        }

                                        dispatch({ operation: 'deleteEnded' })
                                    }),
                            failureAction: () => dispatch({ operation: 'deleteEnded' })
                        }
                    }

                case 'delete':
                    authFetchData(`${getAuthApiUrl()}/roles`, { method: 'delete', body: JSON.stringify({ id: data.original._id }), headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } })
                        .then(async r => {
                            if (!r.response?.ok) {
                                feedback.push({ node: t('Roles.DeletionFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                return
                            }

                            await init()

                            if (Auth.getRole() === data.original.name) {
                                const r = await Auth.logout()

                                if (!r)
                                    feedback.push({ node: t('common.logoutFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                else
                                    navigate('/')
                            }

                            dispatch({ operation: 'deleteEnded' })
                        })
                    return state

                case 'deleteEnded':
                    return {
                        ...state,
                        deletingRow: undefined,
                        ask: { ...state.ask, open: false }
                    }

                case 'setPage':
                    return {
                        ...state,
                        page: data
                    }

                case 'showPrivilegesStart':
                    return { ...state, showPrivileges: data }

                case 'showPrivilegesEnd':
                    return { ...state, showPrivileges: undefined }

                default:
                    throw new Error('Invalid operation requested in RolesDataGrid component reducer!')
            }
        },
        undefined,
        (i) => {
            const defaultOverWriteColumns = [
                {
                    id: '_id',
                    accessorKey: '_id',
                },
                {
                    id: 'displayName',
                    accessorKey: 'displayName',
                    cell: ({ getValue }) => getValue()[configuration.local.language],
                },
                {
                    id: 'privileges',
                    accessorKey: 'privileges',
                    cell: ({ row }) => <Button isIcon variant="text" onClick={() => dispatch({ operation: 'showPrivilegesStart', data: row })}><EyeIcon /></Button>
                },
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
            const defaultAdditionalColumns = functionality.update === true || functionality.delete === true
                ? [
                    {
                        id: 'actions',
                        accessorKey: 'actions',
                        cell: ({ row }) =>
                            <Stack stackProps={{ className: "justify-center w-full" }}>
                                {
                                    functionality.update === true &&
                                    <Button
                                        isIcon
                                        variant='text'
                                        onClick={() => dispatch({ operation: 'updateStarted', data: row })}
                                    >
                                        {state.updatingRow === undefined || state.updatingRow.id !== row.id ? <EditIcon /> : <CircularLoadingIcon />}
                                    </Button>
                                }
                                {
                                    functionality.delete === true &&
                                    <Button
                                        isIcon
                                        variant='text'
                                        fgColor='error'
                                        onClick={() => dispatch({ operation: 'deleteStarted', data: row })}
                                    >
                                        {state.deletingRow === undefined || state.deletingRow.id !== row.id ? <Trash2Icon /> : <CircularLoadingIcon />}
                                    </Button>
                                }
                            </Stack >
                    }
                ]
                : []

            const defaultHeaderNodes = [
                <Button variant='outline' onClick={async () => await init(state.page.offset, state.page.limit)}><RefreshCwIcon />{t('Products.Refresh')}</Button>,
                functionality.create === true && <Button fgColor='success' variant='outline' onClick={() => dispatch({ operation: 'createStarted' })}><PlusIcon />{t('Products.Create')}</Button>,
            ]

            return {
                additionalColumns: options?.appendDefaults === true || options?.appendDefaultAdditionalColumns === true ? (columns?.additionalColumns ?? []).concat(defaultAdditionalColumns) : columns?.additionalColumns ?? [],
                overWriteColumns: options?.appendDefaults === true || options?.appendDefaultOverWriteColumns === true ? (columns?.overWriteColumns ?? []).concat(defaultOverWriteColumns) : columns?.overWriteColumns ?? [],
                headerNodes: options?.appendDefaults === true || options?.appendDefaultHeaderNodes === true ? (headerNodes ?? []).concat(defaultHeaderNodes) : headerNodes ?? [],
                searchedRoles: [],
                searching: false,
                creating: false,
                updatingRow: undefined,
                deletingRow: undefined,
                showPrivileges: undefined,
                ask: { open: false },
                page: { limit: 10, offset: 0 },
            }
        }
    )

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (onChange)
            onChange(roles)
    }, [roles])

    useEffect(() => {
        init()
    }, [])

    console.log('RolesDataGrid', { loading, roles, state, afterDAtaFetchHook, allFunctionalitiesToggle, functionality, options, columns, headerNodes, onChange, dataGridProps })

    return (
        <>
            <DataGrid
                {...dataGridProps}
                data={roles}
                loading={loading}
                additionalColumns={state.additionalColumns}
                overWriteColumns={state.overWriteColumns}
                pagination={functionality.pagination !== true ? undefined : { pageSize: state.page.limit, pageIndex: state.page.offset }}
                onPagination={functionality.pagination !== true ? undefined : async (p) => {
                    const result = await init(p.pageIndex, p.pageSize)
                    if (result)
                        dispatch({ operation: 'setPage', data: { limit: p.pageSize, offset: p.pageIndex } })
                    return result
                }}
                appendHeaderNodes={state.headerNodes}
            />

            <Ask {...state.ask} />

            <Modal
                open={state.creating || state?.updatingRow !== undefined}
                onClose={() => dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })}
            >
                <ManageRole
                    role={state.creating ? undefined : state?.updatingRow?.original as any}
                    onFinish={async () => {
                        dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })
                        await init()
                    }}
                />
            </Modal>

            <Modal
                open={state.showPrivileges !== undefined}
                onClose={() => dispatch({ operation: 'showPrivilegesEnd' })}
            >
                {state?.showPrivileges &&
                    state.showPrivileges.original.privileges.map((m, i) =>
                        <div key={i}>
                            {m.name}
                        </div>
                    )
                }
            </Modal>
        </>
    )
}
