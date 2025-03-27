import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/',
    server: {
        host: '0.0.0.0',
        port: 80,
        strictPort: true,
        cors: {
            origin: 'https://localhost'
        },
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        },
        hmr: {
            path: '/vite-hmr',
            port: 81,
            protocol: 'wss',
            clientPort: 443  // Important for Nginx proxy
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    }
})
