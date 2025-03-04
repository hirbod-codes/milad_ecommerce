import { AuthManager } from "@/src/Backend/Auth/AuthManager";
import { Navigate, useSearchParams } from "react-router";

export function AuthGoogleCallback() {
    const [searchParams, setSearchParams] = useSearchParams();

    let invalidVariables = searchParams.has('access_token') !== true || searchParams.has('refresh_token') !== true

    if (!invalidVariables)
        AuthManager.storeTokens(searchParams.get('access_token')!, searchParams.get('refresh_token')!)

    return (<Navigate to={'/'} />)
}

