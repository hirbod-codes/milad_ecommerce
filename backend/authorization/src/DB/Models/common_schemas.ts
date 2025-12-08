import { ObjectId } from "mongodb";
import { mixed, object, string } from "yup";

export const likeObjectId = mixed((v): v is (ObjectId | string) => v instanceof ObjectId || ObjectId.isValid(v))

export const stringObjectId = mixed((v): v is string => {
    try { ObjectId.createFromHexString(v) }
    catch (e) { return false }
    return typeof v === 'string' && ObjectId.isValid(v);
})

export const localizedText = mixed<any>().optional().test((v: any) => {
    if (v === undefined || v === null)
        return true

    if (typeof v !== 'object' || Array.isArray(v))
        return false

    for (const k in v)
        if (Object.prototype.hasOwnProperty.call(v, k))
            if (!string().required().strict(true).isValidSync(v[k]))
                return false

    return true
}).transform((v, ov) => {
    return ov
})

export function uniqueArrayTest(list: any) {
    if (!list) return true
    if (!Array.isArray(list)) return false
    return list.length === new Set(list).size;
}
