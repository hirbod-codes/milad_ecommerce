import { ObjectShape } from "yup";

export function flattenSchema(fields: ObjectShape, parentKey?: string, flattenFields: { [k: string]: string } = {}): { [k: string]: string } {
    for (const key in fields) {
        if (!Object.prototype.hasOwnProperty.call(fields, key))
            continue

        const fullKey = parentKey ? `${parentKey}.${key}` : key

        const field = fields[key]

        if (field.describe().type === 'object')
            flattenFields = Object.fromEntries(Object.entries(flattenFields).concat(Object.entries(flattenSchema((field as any).fields, fullKey))))
        else
            flattenFields[fullKey] = field.describe().type
    }

    return flattenFields
}
