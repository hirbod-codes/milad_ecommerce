import { ActionDispatch, ComponentProps, ReactNode, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { User } from ".";
import { authFetchData, formatFilters, formatNumber, getAuthApiUrl } from "@/src/Backend/helpers";
import { array } from "yup";
import { t } from "i18next";
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext";
import { DataGrid } from "../DataGrid";
import { ColumnDef, Row, RowSelectionState } from "@tanstack/react-table";
import { Stack } from "../Base/Stack";
import { Button } from "../Base/Button";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { DATE, toFormat } from "@/src/Lib/DateTime/date-time-helpers";
import { EditIcon, FilterIcon, ListFilterIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon, UserIcon } from "lucide-react";
import { CircularLoadingIcon } from "../Base/CircularLoadingIcon";
import { Ask } from "../Ask";
import { Modal } from "../Base/Modal";
import { ManageUser } from "./ManageUser";
import { Input } from "../Base/Input";
import { CircularLoading } from "../Base/CircularLoading";
import { Filters } from "../SearchFilter/index.d";

export type DataGridProps = {
    users?: User[]
    afterDataFetchHook?: (users: User[]) => User[]
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
        appendDefaultColumns?: boolean
        defaultColumns?: ColumnDef<any>[]
        appendDefaultHeaderNodes?: boolean
    }
    columns?: {
        columns?: ColumnDef<any>[]
        additionalColumns?: ColumnDef<any>[]
        overWriteColumns?: ColumnDef<any>[]
    }
    headerNodes?: ReactNode[]
    onChange?: (users: User[]) => void
    onRowSelectionChange?: (rowSelectionState: RowSelectionState) => void
    dataGridProps?: Omit<ComponentProps<typeof DataGrid>, 'data'>
}

export function UsersDataGrid({
    users: inputUsers = [],
    afterDataFetchHook,
    allFunctionalitiesToggle = false,
    functionality,
    options = {
        appendDefaults: true,
        appendDefaultOverWriteColumns: true,
        appendDefaultAdditionalColumns: true,
        appendDefaultHeaderNodes: true,
    },
    columns,
    headerNodes,
    onChange,
    onRowSelectionChange,
    dataGridProps,
}: DataGridProps) {
    const feedback = useContext(FeedbackContext)
    const configuration = useContext(ConfigurationContext)

    const [users, setUsers] = useState<User[]>(inputUsers)
    // const [images, setImages] = useState<{ [k: string]: string }>({})

    if (!functionality)
        functionality = {}

    for (const p of ['search', 'select', 'filter', 'sort', 'create', 'update', 'delete', 'pagination'])
        if ((allFunctionalitiesToggle === true && functionality[p] !== false) || (allFunctionalitiesToggle === false && functionality[p] === true))
            functionality[p] = true
        else
            functionality[p] = false

    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const [openFilter, setOpenFilter] = useState(false)
    const [filters, setFilters] = useState<Filters | undefined>(undefined)

    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const [openSort, setOpenSort] = useState(false)

    const [initialLoading, setInitialLoading] = useState(true)

    const fetchUsers = async (offset: number = 0, limit: number = 0) => {
        const res = await authFetchData(`${getAuthApiUrl()}/users?limit=${limit}&skip=${limit * offset}${filters === undefined ? '' : '&filter=' + JSON.stringify(formatFilters(filters))}`)
        if (!res.response || !res.response.ok || !array().required().isValidSync(res.data)) {
            feedback.push({ node: t('Users.failedToFetchUsers'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
            return false
        }

        if (res.data.length === 0)
            return false

        Object.entries(state.images).forEach(f => URL.revokeObjectURL(f[1]))

        for (let i = 0; i < res.data.length; i++) {
            const user = res.data[i];
            authFetchData(`${getAuthApiUrl()}/users/picture?userId=${user._id}`)
                .then(r => {
                    console.log('r', r)
                    if (r.response && r.response.ok && r.data !== undefined)
                        dispatch({ operation: 'fetchedImages', data: { ...state.images, [user._id]: URL.createObjectURL(r.data) } })
                })
        }

        setUsers(res.data)

        return true
    }

    type State = {
        columns?: ColumnDef<any>[]
        additionalColumns?: ColumnDef<any>[]
        overWriteColumns?: ColumnDef<any>[]
        headerNodes: ReactNode[]
        searchedUsers: User[]
        searching: boolean
        creating: boolean
        updatingRow: Row<any> | undefined
        updatingIsAvailable: Row<any> | undefined
        deletingRow: Row<any> | undefined
        ask: ComponentProps<typeof Ask>
        page: { limit: number, offset: number }
        fetching: boolean
        showTags: Row<any> | undefined
        showCategories: Row<any> | undefined
        showCustomFields: Row<any> | undefined
        searchByPhoneNumber: string
        images: { [k: string]: string }
    }

    type Actions =
        { operation: 'fetchedImages', data: { [k: string]: string } } |
        { operation: 'searchedByPhoneNumber', data: User[] } |
        { operation: 'searchByPhoneNumber', data: string } |
        { operation: 'fetch' | 'fetched' | 'createStarted' | 'createEnded' | 'updateEnded' | 'deleteEnded' | 'updatedIsAvailable' } |
        { operation: 'updateStarted' | 'updateIsAvailable' | 'deleteStarted' | 'showCategories' | 'showTags' | 'showCustomFields', data: Row<any> } |
        { operation: 'setPage', data: { offset: number, limit: number } }

    const reducer = (state: State, arg: Actions): State => {
        switch (arg.operation) {
            case 'fetchedImages':
                return { ...state, images: arg.data }

            case 'fetch':
                return { ...state, fetching: true, headerNodes: [...state.headerNodes] }

            case 'fetched':
                return { ...state, fetching: false }

            case 'createStarted':
                return {
                    ...state,
                    creating: true
                }

            case 'createEnded':
                fetchUsers(state.page.offset, state.page.limit)
                return {
                    ...state,
                    creating: false
                }

            case 'updateStarted':
                return {
                    ...state,
                    updatingRow: arg.data
                }

            case 'updateEnded':
                fetchUsers(state.page.offset, state.page.limit)
                return {
                    ...state,
                    updatingRow: undefined
                }

            case 'updateIsAvailable':
                return { ...state, updatingIsAvailable: arg.data, headerNodes: [...state.headerNodes] }

            case 'updatedIsAvailable':
                return { ...state, updatingIsAvailable: undefined, headerNodes: [...state.headerNodes] }

            case 'deleteStarted':
                return {
                    ...state,
                    deletingRow: arg.data,
                    ask: {
                        open: true,
                        title: t('Users.deletionTitle'),
                        content: t('Users.deletionContent'),
                        successAction: () =>
                            authFetchData(`${getAuthApiUrl()}/users`, { method: 'delete', body: JSON.stringify({ id: arg.data.original._id }) })
                                .then(async r => {
                                    if (!r.response?.ok) {
                                        feedback.push({ node: t('Users.DeletionFailure'), color: { bgColor: 'error', fgColor: 'error-foreground' } })
                                        return
                                    }

                                    dispatch({ operation: 'fetch' })

                                    dispatch({ operation: 'deleteEnded' })
                                }),
                        failureAction: () => dispatch({ operation: 'deleteEnded' })
                    }
                }

            case 'deleteEnded':
                return {
                    ...state,
                    deletingRow: undefined,
                    ask: { ...state.ask, open: false }
                }

            case 'setPage':
                return {
                    ...state,
                    page: arg.data
                }

            case 'showCategories':
                return {
                    ...state,
                    showCategories: arg.data
                }

            case 'showTags':
                return {
                    ...state,
                    showTags: arg.data
                }

            case 'showCustomFields':
                return {
                    ...state,
                    showCustomFields: arg.data
                }

            case 'searchByPhoneNumber':
                return { ...state, searchByPhoneNumber: arg.data, searching: true }

            case 'searchedByPhoneNumber':
                return { ...state, searchedUsers: arg.data, searching: false }

            default:
                throw new Error(`Invalid operation requested in UsersDataGrid component reducer!${typeof (arg as any).operation === 'string' ? ': ' + (arg as any).operation : ''}`)
        }
    }

    const [state, dispatch]: [State, ActionDispatch<[Actions]>] = useReducer<State, [Actions]>(reducer, {
        columns: [],
        additionalColumns: [],
        overWriteColumns: [],
        headerNodes: [],
        searchedUsers: [],
        searching: false,
        searchByPhoneNumber: '',
        creating: false,
        updatingRow: undefined,
        updatingIsAvailable: undefined,
        deletingRow: undefined,
        ask: { open: false },
        page: { limit: 10, offset: 0 },
        showTags: undefined,
        showCategories: undefined,
        showCustomFields: undefined,
        images: {},
        fetching: false,
    })

    const timer = useRef(undefined)

    useEffect(() => {
        if (timer.current !== undefined)
            clearTimeout(timer.current)
        if (state?.searchByPhoneNumber?.trim())
            timer.current = setTimeout(async () => {
                const r = await authFetchData(`${getAuthApiUrl()}/users/search?search=${state.searchByPhoneNumber}`)
                if (!r.response || !r.response.ok) {
                    feedback.pushError({ node: t('UsersDataGrid.UserSearchFailed') })
                    dispatch({ operation: 'searchedByPhoneNumber', data: [] })
                }
                else
                    dispatch({ operation: 'searchedByPhoneNumber', data: r.data })
            }, 1500)
        else
            dispatch({ operation: 'searchedByPhoneNumber', data: [] })
    }, [state?.searchByPhoneNumber])

    useEffect(() => {
        if (state.updatingIsAvailable !== undefined) {
            authFetchData(`${getAuthApiUrl()}/users`, { method: 'PATCH', body: JSON.stringify({ id: state.updatingIsAvailable.original._id, user: { isAvailable: !state.updatingIsAvailable.original.isAvailable } }) })
                .then(async r => {
                    if (!r.response || !r.response.ok) {
                        feedback.push({ node: t('UpdateOrder.updateFailed'), color: { bgColor: 'error', fgColor: 'error-foreground' } });
                        return;
                    }

                    await fetchUsers(state.page.offset, state.page.limit)

                    feedback.push({ node: t('UpdateOrder.updateSucceeded'), color: { bgColor: 'success', fgColor: 'success-foreground' } });
                })
                .finally(() => dispatch({ operation: 'updatedIsAvailable' }))
        }
    }, [state.updatingIsAvailable])

    useEffect(() => {
        if (state.fetching === true)
            fetchUsers(state.page.offset, state.page.limit)
                .finally(() => dispatch({ operation: 'fetched' }))
    }, [state.fetching])

    useEffect(() => {
        if (onChange)
            onChange(users)
    }, [users])

    useEffect(() => {
        if (users.length === 0) {
            setInitialLoading(true)
            fetchUsers(state.page.offset, state.page.limit)
                .finally(() => setInitialLoading(false))
        } else
            setInitialLoading(false)
    }, [])

    const defaultOverWriteColumns = [
        {
            id: 'phoneNumber',
            accessorKey: 'phoneNumber',
            cell: ({ getValue }) => formatNumber(configuration, getValue(), { useGrouping: false, minimumIntegerDigits: 11 }).replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3'),
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
    const defaultAdditionalColumns: ColumnDef<User>[] = [
        {
            id: 'avatar',
            cell(props) {
                return <Stack stackProps={{ className: 'justify-center' }}>
                    {
                        state.images[props.row.original._id]
                            ? <div className="rounded-full shadow-md border size-10 overflow-hidden flex flex-row justify-center items-center">
                                <img loading="lazy" src={state.images[props.row.original._id]} className="size-full object-cover" />
                            </div>
                            : <Button className="size-10" variant="outline" isIcon><UserIcon /> </Button>
                    }
                </Stack>
            },
        }
    ]

    if (functionality.update === true || functionality.delete === true)
        defaultAdditionalColumns.push({
            id: 'actions',
            cell: ({ row }) =>
                <Stack stackProps={{ className: "justify-center w-full" }}>
                    {
                        functionality.update === true &&
                        <Button
                            isIcon
                            variant='text'
                            onClick={() => dispatch({ operation: 'updateStarted', data: row })}
                        >
                            {state.updatingRow === undefined || state.updatingRow.original._id !== row.original._id ? <EditIcon /> : <CircularLoadingIcon />}
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
                            {state.deletingRow === undefined || state.deletingRow.original._id !== row.original._id ? <Trash2Icon /> : <CircularLoadingIcon />}
                        </Button>
                    }
                </Stack>
        })

    const defaultHeaderNodes = [
        <Button variant='outline' disabled={state.fetching} onClick={() => dispatch({ operation: 'fetch' })}>{state.fetching === true ? <CircularLoadingIcon /> : <RefreshCwIcon />}{t('Users.Refresh')}</Button>,
        functionality.filter === true && <Button buttonRef={filterButtonRef} variant='outline' onClick={() => setOpenFilter(true)}><FilterIcon />{t('Users.Filters')}</Button>,
        functionality.sort === true && <Button buttonRef={sortButtonRef} variant='outline' onClick={() => setOpenSort(true)}><ListFilterIcon />{t('Users.Sorts')}</Button>,
        functionality.create === true && <Button fgColor='success' variant='outline' onClick={() => dispatch({ operation: 'createStarted' })}><PlusIcon />{t('Users.Create')}</Button>,
        functionality.search === true && <Input startIcon={state?.searching ? <CircularLoading size="xs" /> : <SearchIcon />} placeholder={t('UsersDataGrid.SearchByPhoneNumber')} value={state.searchByPhoneNumber ?? ''} onChange={(e) => dispatch({ operation: 'searchByPhoneNumber', data: e.target.value.trim() })} />,
    ]

    console.log('UsersDataGrid', { users, state, afterDataFetchHook, allFunctionalitiesToggle, functionality, options, columns, headerNodes, onChange, dataGridProps })

    return (
        <>
            <DataGrid
                configName={'Users'}
                defaultColumnVisibilityModel={{ _id: false }}
                defaultColumnOrderModel={['actions', 'avatar', 'role', 'firstName', 'lastName', 'username', 'phoneNumber', 'email']}
                {...dataGridProps}
                data={state?.searchByPhoneNumber?.trim() ? state.searchedUsers : users}
                loading={initialLoading}
                columns={columns?.columns}
                additionalColumns={options?.appendDefaults === true || options?.appendDefaultAdditionalColumns === true ? (columns?.additionalColumns ?? []).concat(defaultAdditionalColumns) : columns?.additionalColumns}
                overWriteColumns={options?.appendDefaults === true || options?.appendDefaultOverWriteColumns === true ? (columns?.overWriteColumns ?? []).concat(defaultOverWriteColumns) : columns?.overWriteColumns}
                pagination={functionality.pagination !== true ? undefined : { pageSize: state.page.limit, pageIndex: state.page.offset }}
                onPagination={functionality.pagination !== true ? undefined : async (p) => {
                    const result = await fetchUsers(p.pageIndex, p.pageSize)
                    if (result)
                        dispatch({ operation: 'setPage', data: { limit: p.pageSize, offset: p.pageIndex } })
                    return result
                }}
                appendHeaderNodes={options?.appendDefaults === true || options?.appendDefaultHeaderNodes === true ? (headerNodes ?? []).concat(defaultHeaderNodes) : headerNodes}
                onRowSelectionChange={onRowSelectionChange}
            />

            <Ask {...state.ask} />

            <Modal
                open={state.creating || state?.updatingRow !== undefined}
                onClose={() => dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })}
            >
                <ManageUser
                    user={state.creating ? undefined : state?.updatingRow?.original as any}
                    onFinish={async () => {
                        dispatch({ operation: state.creating ? 'createEnded' : 'updateEnded' })
                        await fetchUsers(state.page.offset, state.page.limit)
                    }}
                />
            </Modal>
        </>
    )
}
