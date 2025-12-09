import { useMemo } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Layout } from "./Pages/Layout"
import { Home } from "./Pages/Home"
import { Error } from "./Pages/Error"
import { NotFound } from "./Pages/NotFound"
import { Dashboard } from "./Pages/Dashboard"
import { Layout as DashboardLayout } from "./Pages/Dashboard/Layout"
import { Users } from "./Pages/Dashboard/Users"
import { Roles } from "./Pages/Dashboard/Roles"
import { Categories } from "./Pages/Dashboard/Categories"
import { Tags } from "./Pages/Dashboard/Tags"
import { Products } from "./Pages/Dashboard/Products"
import { Orders } from "./Pages/Dashboard/Orders"
import { Settings } from "./Pages/Dashboard/Settings"
import { AboutUs } from "./Pages/AboutUs"
import { Category } from "./Pages/Category"

export function Main() {
    console.log('Main')

    const dashboardLayout = useMemo(() => <DashboardLayout />, [])
    const dashboardHome = useMemo(() => <Dashboard />, [])
    const dashboardUsers = useMemo(() => <Users />, [])
    const dashboardRoles = useMemo(() => <Roles />, [])
    const dashboardCategories = useMemo(() => <Categories />, [])
    const dashboardTags = useMemo(() => <Tags />, [])
    const dashboardProducts = useMemo(() => <Products />, [])
    const dashboardOrder = useMemo(() => <Orders />, [])
    const dashboardSettings = useMemo(() => <Settings />, [])
    const home = useMemo(() => <Home />, [])
    const category = useMemo(() => <Category />, [])
    const aboutUs = useMemo(() => <AboutUs />, [])
    const error = useMemo(() => <Error />, [])
    const notFound = useMemo(() => <NotFound />, [])

    const router = createBrowserRouter([
        {
            path: '/',
            element: <Layout />,
            // errorElement: error,
            children: [
                {
                    index: true,
                    path: "/",
                    element: home
                },
                {
                    path: "/about-us",
                    element: aboutUs
                },
                {
                    path: "/Dashboard",
                    element: dashboardLayout,
                    children: [
                        {
                            path: "Users",
                            element: dashboardUsers,
                        },
                        {
                            path: "Roles",
                            element: dashboardRoles,
                        },
                        {
                            path: "Categories",
                            element: dashboardCategories,
                        },
                        {
                            path: "Tags",
                            element: dashboardTags,
                        },
                        {
                            path: "Products",
                            element: dashboardProducts,
                        },
                        {
                            path: "Orders",
                            element: dashboardOrder,
                        },
                        {
                            path: "Settings",
                            element: dashboardSettings,
                        },
                    ]
                },
                {
                    path: "Category",
                    element: category
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

