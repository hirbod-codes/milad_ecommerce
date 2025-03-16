import { Filter } from "mongodb";
import { AnyObject, array, object, ObjectSchema } from "yup";

export const MONGODB_OPERATORS = ['$all', '$in', '$nin', '$eq', '$ne', '$not', '$gt', '$gte', '$lt', '$lte', '$size']

export function validateFilters<T>(filter: Filter<T>, schema?: ObjectSchema<AnyObject>, validFields?: string[], level = 0): boolean {
    try {
        if (level > 3)
            return false
        else if (array().required().strict(true).isValidSync(filter)) {
            for (const f of filter)
                if (validateFilters(f, schema, validFields, level++) !== true)
                    return false
        } else if (object().required().strict(true).isValidSync(filter)) {
            let entries = Object.entries(filter)
            for (const kv of entries)
                if (['$and', '$or'].includes(kv[0])) {
                    if (!array().strict(true).required().isValidSync(kv[1]))
                        return false
                    else if (validateFilters(kv[1], schema, validFields, level++) !== true)
                        return false
                } else {
                    if (validFields && !validFields.includes(kv[0]))
                        return false

                    if (!object().required().strict(true).isValidSync(kv[1])) {
                        if (schema && !schema.pick([kv[0]]).isValidSync({ [kv[0]]: kv[1] }))
                            return false
                    } else {
                        let kvEntries = Object.entries(kv[1])
                        if (kvEntries.length !== 1 || !MONGODB_OPERATORS.includes(kvEntries[0][0]))
                            return false
                    }
                }
        } else
            return false

        return true
    }
    catch (e) { console.error(e); return false }
}
