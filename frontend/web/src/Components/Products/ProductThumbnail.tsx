import { useContext, useEffect, useState } from "react";
import { Product } from "./index.d";
import { fetchData, formatCurrency, getApiUrl } from "@/src/Backend/helpers";
import { array } from "yup";
import { Stack } from "../Base/Stack";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";

export function ProductThumbnail({ product }: { product: Product }) {
    const configuration = useContext(ConfigurationContext)

    const [image, setImage] = useState(undefined)

    useEffect(() => {
        fetchData(`${getApiUrl()}/products/pictures/productIds?productIds=${product._id}`)
            .then(r => {
                if (r.response && r.response.ok && array().required().isValidSync(r.data))
                    fetchData(`${getApiUrl()}/products/picture/fileId?fileId=${r.data[0]._id}`)
                        .then(rr => {
                            if (r.response && r.response.ok)
                                setImage(URL.createObjectURL(rr.data))
                        })
            })
    }, [])

    return (
        <Stack direction="vertical" stackProps={{ className: 'p-2 justify-between h-full w-[7cm] border rounded-lg' }}>
            <div className="flex-grow flex flex-row items-center justify-center overflow-hidden w-fit shadow-lg rounded-lg">
                <img src={image} className="w-full" loading="lazy" />
            </div>

            <Stack direction="vertical">
                <div className="hover:underline text-md text-ellipsis text-nowrap overflow-hidden">
                    {product.displayName[configuration.local.language]}
                </div>

                <div className="hover:underline text-sm text-ellipsis text-nowrap overflow-hidden">
                    {product.price.IRR && formatCurrency(configuration, product.price.IRR)}
                </div>
            </Stack>
        </Stack>
    )
}

