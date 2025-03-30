import { GoogleAuthManager } from "@/src/Backend/Auth/GoogleAuthManager";
import { Button } from "@/src/Components/Base/Button";
import { memo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

export const Home = memo(function Home() {
    const [queryVars, setQueryVars] = useSearchParams()
    const code = queryVars.get('code')

    const navigate = useNavigate()

    console.log('Home', { code })

    useEffect(() => {
        console.log('Home', 'useEffect')
        googleAuth()
    }, [])

    const googleAuth = async () => {
        console.log('Home', 'googleAuth')

        try {
            if (code) {
                if (await GoogleAuthManager.authenticate(code) === true)
                    window.location.href = window.location.origin + window.location.pathname;
            } else
                console.log('no code')
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div>Home<Button onClick={() => navigate('/about-us')}>a</Button></div>
    )
})
