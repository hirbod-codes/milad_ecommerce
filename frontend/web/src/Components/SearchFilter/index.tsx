import { Filters as FiltersType } from "./index.d"
import { Filters } from "./Filters"

/**
 * 
 * @param fields keys are names of fields an values are types of fields
 * @returns 
 */
export function SearchFilter({ fields, filters, setFilters }: { fields: { [k: string]: string }, filters: FiltersType, setFilters: (v: FiltersType) => void }) {
    console.log('SearchFilter', { fields, filters })

    return (
        <Filters
            fields={fields}
            filters={filters}
            setFilters={setFilters}
        />
    )
}
