import { GoogleAuthManager } from "@/src/Backend/Auth/GoogleAuthManager";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

export function Home() {
    console.log('Home')

    const navigate = useNavigate()

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

        navigate('/')
    }

    return (
        <div>Home</div>
    )
}
