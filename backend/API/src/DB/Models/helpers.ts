import { ObjectShape } from "yup";

export function flattenSchema(fields: ObjectShape, parentKey?: string): string[] {
    let keys: string[] = []
    for (const key in fields) {
        if (!Object.prototype.hasOwnProperty.call(fields, key))
            continue

        const fullKey = parentKey ? `${parentKey}.${key}` : key

        const field = fields[key]

        if (field.describe().type === 'object')
            keys = keys.concat(flattenSchema((field as any).fields, fullKey))
        else
            keys.push(fullKey)
    }

    return keys
}
