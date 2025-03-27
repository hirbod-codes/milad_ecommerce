export type Category = {
    _id: string
    parentCategory: string
    name: string
    displayName: { [k: string]: string }
    view: number
}
