import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'tag'

export const schemaVersion = 'v1.0.0'

export const tagSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    name: string().required(),
    views: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Tag = InferType<typeof tagSchema>

export const tagInputSchema = tagSchema.required().noUnknown(true).strict(true).pick(['name'])
export type TagInput = InferType<typeof tagInputSchema>

export const tagCreateSchema = tagSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type TagCreate = InferType<typeof tagCreateSchema>

export const tagUpdateSchema = tagSchema.required().noUnknown(true).strict(true).pick(['views'])
export type TagUpdate = InferType<typeof tagUpdateSchema>

export const tagImmutableSchema = tagSchema.required().noUnknown(true).strict(true).pick(Object.keys(tagSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(tagUpdateSchema.fields)).includes(f)) as any)
export type TagImmutable = InferType<typeof tagImmutableSchema>

export const fields: string[] = Object.keys(tagSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []
