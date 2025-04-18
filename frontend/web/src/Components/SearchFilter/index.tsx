import { Filters as FiltersType } from "./index.d"
import { Filters } from "./Filters"

/**
 * 
 * @param fields keys are names of fields an values are types of fields
 * @returns 
 */
export function SearchFilter({ fields, displayFields, filters, setFilters }: { fields: { [k: string]: string }, displayFields?: { [k: string]: string }, filters: FiltersType, setFilters: (v: FiltersType) => void }) {
    console.log('SearchFilter', { fields, filters, displayFields })

    return (
        <Filters
            fields={fields}
            displayFields={displayFields}
            filters={filters}
            setFilters={setFilters}
        />
    )
}
