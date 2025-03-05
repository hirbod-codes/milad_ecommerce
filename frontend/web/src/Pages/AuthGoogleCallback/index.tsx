import { AuthManager } from "@/src/Backend/Auth/AuthManager";
import { Navigate, useSearchParams } from "react-router";

export function AuthGoogleCallback() {
    const [searchParams, setSearchParams] = useSearchParams();

    for (const k of searchParams.keys()) {
        console.log('k', k)
    }

    for (const v of searchParams.values()) {
        console.log('v', v)
    }

    // let invalidVariables = searchParams.has('access_token') !== true || searchParams.has('refresh_token') !== true

    // if (!invalidVariables)
    //     AuthManager.storeTokens(searchParams.get('access_token')!, searchParams.get('refresh_token')!)

    return (
        <>
            HI
        </>
    )
}

