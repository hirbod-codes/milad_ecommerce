export type Category = {
    _id: string
    parentCategory: string
    recommendedProductProperties?: { name: string, display: { [k: string]: string } }[]
    name: string
    displayName: { [k: string]: string }
    view: number
}
