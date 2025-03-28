import { useState } from "react"
import { Filters as FiltersType } from "./index.d"
import { Filters } from "./Filters"

/**
 * 
 * @param fields keys are names of fields an values are types of fields
 * @returns 
 */
export function SearchFilter({ fields }: { fields: { [k: string]: string } }) {
    const [filters, setFilters] = useState<FiltersType>({ $and: [] })

    console.log('SearchFilter', { filters })

    return (
        <Filters
            fields={fields}
            filters={filters}
            setFilters={(v) => setFilters(v)}
        />
    )
}
