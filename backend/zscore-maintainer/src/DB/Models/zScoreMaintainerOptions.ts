import { array, InferType, number, object, string } from "yup";
import { likeObjectId } from "../../../../API/src/DB/Models/common_schemas";

export const collectionName = 'zScoreMaintainerOptions'

export const schemaVersion = 'v1.0.0'

export const zScoreMaintainerOptionsSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    lastProcessedSaleId: likeObjectId.optional(),
    lastProcessedViewId: likeObjectId.optional(),
    addresses: array().required().of(object().required().shape({ host: string().required(), port: number().required() })),
    updatedAt: number().strict(true).required(),
    createdAt: number().strict(true).required()
})
export type ZScoreMaintainerOptions = InferType<typeof zScoreMaintainerOptionsSchema>

export const zScoreMaintainerOptionsCreateSchema = zScoreMaintainerOptionsSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ZScoreMaintainerOptionsCreate = InferType<typeof zScoreMaintainerOptionsCreateSchema>

export const fields: (keyof ZScoreMaintainerOptions)[] = Object.keys(zScoreMaintainerOptionsSchema.fields) as any
export const readableFields: (keyof Omit<ZScoreMaintainerOptions, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
