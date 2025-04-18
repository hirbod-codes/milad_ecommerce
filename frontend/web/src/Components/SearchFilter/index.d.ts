export enum logicOperators { $and = '$and', $or = '$or' }

export enum operators { $in = '$in', $eq = '$eq', $ne = '$ne', $gt = '$gt', $gte = '$gte', $lt = '$lt', $lte = '$lte' }

export type Filter = { id: number, field: string, operator: keyof typeof operators, value: any }

export type Filters = { [k in keyof typeof logicOperators | 'id']?: (Filter | Filters)[] | number }
