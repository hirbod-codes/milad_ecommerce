import { GoogleAuthManager } from "@/src/Backend/Auth/GoogleAuthManager";
import { useEffect } from "react";
import { useSearchParams } from "react-router";

export function Home() {
    console.log('Home')

    const [queryVars, setQueryVars] = useSearchParams()
    const code = queryVars.get('code')

    console.log('Home', { code })

    useEffect(() => {
        console.log('Home', 'useEffect')
        googleAuth()
    }, [])

    const googleAuth = async () => {
        console.log('Home', 'googleAuth')

        try {
            if (code)
                await GoogleAuthManager.authenticate(code)
            else
                console.log('no code')
        } catch (e) {
            console.error(e)
        }

        if (code)
            window.location.reload();
    }

    return (
        <div>Home</div>
    )
}
