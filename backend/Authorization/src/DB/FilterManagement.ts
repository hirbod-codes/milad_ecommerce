import { Filter } from "mongodb";
import { AnyObject, array, object, ObjectSchema } from "yup";

export class FilterManagement {
    static MONGODB_OPERATORS: string[] = ['$all', '$in', '$nin', '$eq', '$ne', '$not', '$gt', '$gte', '$lt', '$lte', '$size']

    static validateFilters<T>(filter: Filter<T>, schema?: ObjectSchema<AnyObject>, validFields?: string[], invalidFields?: string[]): boolean {
        return new FilterManagement().validate(filter, schema, validFields, invalidFields)
    }

    private fields: string[] = []
    private filterCount: number = 0
    validate<T>(filter: Filter<T>, schema?: ObjectSchema<AnyObject>, validFields?: string[], invalidFields?: string[], level = 0): boolean {
        try {
            if (level === 0) {
                this.fields = []
                this.filterCount = 0
            }

            if (level > 3)
                return false

            if (array().required().strict(true).isValidSync(filter)) {
                for (const f of filter)
                    if (this.validate(f, schema, validFields, invalidFields, level++) !== true)
                        return false
            } else if (object().required().strict(true).isValidSync(filter)) {
                let entries = Object.entries(filter)
                if (entries.length !== 1)
                    return false

                for (const kv of entries)
                    if (['$and', '$or'].includes(kv[0])) {
                        if (!array().strict(true).required().min(1).isValidSync(kv[1]))
                            return false

                        if (this.validate(kv[1], schema, validFields, invalidFields, level++) !== true)
                            return false
                    } else {
                        let filterEntries = kv
                        if (this.fields.length >= 6)
                            return false

                        if (!this.fields.includes(filterEntries[0]))
                            this.fields.push(filterEntries[0])

                        this.filterCount++

                        if (this.filterCount >= 10)
                            return false

                        if (invalidFields && invalidFields.includes(filterEntries[0]))
                            return false

                        if (validFields && !validFields.includes(filterEntries[0]))
                            return false

                        if (object().required().strict(true).isValidSync(filterEntries[1])) {
                            let kvEntries = Object.entries(filterEntries[1])
                            if (kvEntries.length !== 1 || !FilterManagement.MONGODB_OPERATORS.includes(kvEntries[0][0]))
                                return false
                        } else if (schema && Object.keys(schema.fields).includes(filterEntries[0]) && !schema.pick([filterEntries[0]]).isValidSync({ [filterEntries[0]]: filterEntries[1] }))
                            return false
                    }
            } else
                return false

            return true
        }
        catch (e) { console.error(e); return false }
    }
}
