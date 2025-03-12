import { useMemo } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Layout } from "./Pages/Layout"
import { Home } from "./Pages/Home"
import { Error } from "./Pages/Error"
import { NotFound } from "./Pages/NotFound"
import { AuthGoogleCallback } from "./Pages/AuthGoogleCallback"

export function Main() {
    console.log('Main')

    const authGoogleCallback = useMemo(() =><AuthGoogleCallback />, [])
    const home = useMemo(() => <Home />, [])
    const error = useMemo(() => <Error />, [])
    const notFound = useMemo(() => <NotFound />, [])

    const router = createBrowserRouter([
        {
            path: '/',
            element: <Layout />,
            errorElement: error,
            children: [
                {
                    index: true,
                    path: "/",
                    element: home
                },
                {
                    path: "/auth/google/callback",
                    element: authGoogleCallback
                },
                {
                    path: "error",
                    element: error
                },
            ]
        },
        {
            path: '*',
            element: <Layout />,
            children: [
                {
                    path: "*",
                    element: notFound
                },
            ]
        }
    ]);

    return (<RouterProvider router={router} />)
}

