import { Fragment, useContext, useState } from "react";
import { DataGridContext } from "./Context";
import { ConfigurationContext } from "../../Contexts/Configuration/ConfigurationContext";
import { Button } from "../../Components/Base/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { CircularLoadingIcon } from "../Base/CircularLoadingIcon";
import { FinitePagination } from "./FinitePagination";
import { Select } from "../Base/Select";
import { Stack } from "../Base/Stack";
import { Separator } from "../../shadcn/components/ui/separator";

export type PaginationProps = {
    paginationLimitOptions?: number[],
    onPagination?: (paginationLimit: number, pageOffset: number) => Promise<boolean> | boolean,
    setPaginationLimitChange?: (paginationLimit: number) => void | Promise<void>
}

export function Pagination({ paginationLimitOptions = [10, 25, 50, 100], onPagination, setPaginationLimitChange }: PaginationProps) {
    const configuration = useContext(ConfigurationContext)!;

    const table = useContext(DataGridContext)!.table!

    const [paginationLimit, setPaginationLimit] = useState<number>(paginationLimitOptions[0])

    const [page, setPage] = useState<number>(0)

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isChangingLimit, setIsChangingLimit] = useState<boolean>(false)

    console.log('Pagination', { page, paginationLimit })

    return (
        <Stack stackProps={{ className: 'justify-end items-center' }}>
            <Select
                loading={isChangingLimit}
                defaultValue={paginationLimit.toString()}
                defaultDisplayValue={paginationLimit.toString()}
                onValueChange={async (value) => {
                    setIsChangingLimit(true)
                    setPaginationLimit(Math.floor(Number(value)))
                    if (setPaginationLimitChange)
                        await setPaginationLimitChange(Math.floor(Number(value)))
                    setPage(0)
                    setIsChangingLimit(false)
                }}
            >
                {paginationLimitOptions.map((l, i) =>
                    <Fragment key={i}>
                        <Select.Item value={l.toString()} displayValue={l.toString()}>
                            {l.toString()}
                        </Select.Item>
                        {i !== paginationLimitOptions.length - 1 &&
                            <Separator />
                        }
                    </Fragment>
                )}
            </Select>

            {
                !onPagination
                    ?
                    <FinitePagination
                        count={Math.ceil(table.getRowCount() / paginationLimit)}
                        onChange={(page) => {
                            table.setPageIndex(page - 1)

                            setPage(page)
                        }} />
                    :
                    <Stack>
                        <Button
                            onClick={async () => {
                                setIsLoading(true)
                                const result = await onPagination(paginationLimit, page - 1)
                                setIsLoading(false)

                                if (result)
                                    setPage(page - 1)
                            }}
                            disabled={isLoading}
                            isIcon
                            variant="outline"
                            size='sm'
                        >
                            {
                                configuration.local.direction === 'ltr'
                                    ? <ChevronLeftIcon fontSize="inherit" />
                                    : <ChevronRightIcon fontSize="inherit" />
                            }
                        </Button>

                        {!isLoading
                            ? <Button size='sm' variant="outline" isIcon>{page}</Button>
                            : <Button disabled isIcon size='sm' variant='outline'>
                                <CircularLoadingIcon />
                            </Button>
                        }

                        <Button
                            onClick={async () => {
                                setIsLoading(true)
                                const result = await onPagination(paginationLimit, page + 1)
                                setIsLoading(false)

                                if (result)
                                    setPage(page + 1)
                            }}
                            disabled={isLoading}
                            isIcon
                            variant="outline"
                            size='sm'
                        >
                            {
                                configuration.local.direction === 'ltr'
                                    ? <ChevronRightIcon fontSize="inherit" />
                                    : <ChevronLeftIcon fontSize="inherit" />
                            }
                        </Button>
                    </Stack>
            }
        </Stack >
    )
}
