import { Fragment, ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { Button } from "../../Components/Base/Button"
import { ConfigurationContext } from "../../Contexts/Configuration/ConfigurationContext"
import { ChevronLeftIcon, ChevronRightIcon, EllipsisIcon } from "lucide-react"

export function FinitePagination({ count, onChange }: { count: number, onChange: (page: number) => void }) {
    const configuration = useContext(ConfigurationContext)!

    const [page, setPage] = useState<number>(0)

    useEffect(() => {
        onChange(page)
    }, [page])

    const paginationItems: ReactNode[] = useMemo(() => {
        const arr: ReactNode[] = []
        if (count <= 7)
            for (let i = 0; i < count; i++)
                paginationItems.push(<Button isIcon onClick={() => setPage(i)}>{i + 1}</Button>)
        else
            for (let i = 0; i < 7; i++) {
                if (i === 0) {
                    paginationItems.push(<Button isIcon onClick={() => setPage(0)}>{1}</Button>)
                    continue
                }

                if (i === 6) {
                    paginationItems.push(<Button isIcon onClick={() => setPage(count - 1)}>{count}</Button>)
                    continue
                }

                if (i === 1) {
                    if (page >= 4)
                        paginationItems.push(<Button isIcon ><EllipsisIcon /></Button>)
                    else
                        paginationItems.push(<Button isIcon onClick={() => setPage(1)}>2</Button>)
                    continue
                }

                if (i === 5) {
                    if ((count - page) > 3)
                        paginationItems.push(<Button isIcon ><EllipsisIcon /></Button>)
                    else
                        paginationItems.push(<Button isIcon onClick={() => setPage(count - 2)}>{count - 1}</Button>)
                    continue
                }

                let j = i

                if (page <= i)
                    paginationItems.push(<Button isIcon onClick={() => setPage(i)}>{i + 1}</Button>)
                else
                    paginationItems.push(<Button isIcon onClick={() => setPage(page + (i - 3))}>{page + (i - 3) + 1}</Button>)

                // 0O 01 02 03 04 05 06
                // 0O 0O 0O 0O 0O 0O 0O
                // Pagination states
                // 01 02 03 04 05 .. 70
                // 01 .. 04 05 06 .. 70
                // 01 .. 07 08 09 .. 70
                // 01 .. 66 67 68 69 70
            }
        return arr
    }, [page])

    return (
        <div className="flex flex-row">
            {
                configuration.local.direction === 'ltr'
                    ? <ChevronLeftIcon fontSize="inherit" />
                    : <ChevronRightIcon fontSize="inherit" />
            }

            {paginationItems.map((item, i) =>
                <Fragment key={i}>{item}</Fragment>
            )}

            {
                configuration.local.direction === 'ltr'
                    ? <ChevronRightIcon fontSize="inherit" />
                    : <ChevronLeftIcon fontSize="inherit" />
            }
        </div>
    )
}

