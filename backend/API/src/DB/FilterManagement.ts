import { Filter } from "mongodb";
import { AnyObject, array, object, ObjectSchema } from "yup";

export class FilterManagement {
    static MONGODB_OPERATORS: string[] = ['$all', '$in', '$nin', '$eq', '$ne', '$not', '$gt', '$gte', '$lt', '$lte', '$size']

    static validateFilters<T>(filter: Filter<T>, schema?: ObjectSchema<AnyObject>, validFields?: string[]): boolean {
        return new FilterManagement().validate(filter, schema, validFields)
    }

    private fields: string[] = []
    private filterCount: number = 0
    validate<T>(filter: Filter<T>, schema?: ObjectSchema<AnyObject>, validFields?: string[], level = 0): boolean {
        try {
            if (level === 0) {
                this.fields = []
                this.filterCount = 0
            } else if (level > 3)
                return false
            else if (array().required().strict(true).isValidSync(filter)) {
                for (const f of filter)
                    if (this.validate(f, schema, validFields, level++) !== true)
                        return false
            } else if (object().required().strict(true).isValidSync(filter)) {
                let entries = Object.entries(filter)
                for (const kv of entries)
                    if (['$and', '$or'].includes(kv[0])) {
                        if (!array().strict(true).required().isValidSync(kv[1]))
                            return false
                        else if (this.validate(kv[1], schema, validFields, level++) !== true)
                            return false
                    } else {
                        if (this.fields.length >= 6)
                            return false
                        else if (!this.fields.includes(kv[0]))
                            this.fields.push(kv[0])

                        if (this.filterCount >= 10)
                            return false
                        else
                            this.filterCount++

                        if (validFields && !validFields.includes(kv[0]))
                            return false

                        if (!object().required().strict(true).isValidSync(kv[1])) {
                            if (schema && !schema.pick([kv[0]]).isValidSync({ [kv[0]]: kv[1] }))
                                return false
                        } else {
                            let kvEntries = Object.entries(kv[1])
                            if (kvEntries.length !== 1 || !FilterManagement.MONGODB_OPERATORS.includes(kvEntries[0][0]))
                                return false
                        }
                    }
            } else
                return false

            return true
        }
        catch (e) { console.error(e); return false }
    }
}
