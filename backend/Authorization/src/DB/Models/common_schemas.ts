import { ObjectId } from "mongodb";
import { mixed } from "yup";

export const likeObjectId = mixed((v): v is (ObjectId | string) => v instanceof ObjectId && ObjectId.isValid(v))

export const stringObjectId = mixed((v): v is string => {
    try { ObjectId.createFromHexString(v) }
    catch (e) { return false }
    return typeof v === 'string' && ObjectId.isValid(v);
})
