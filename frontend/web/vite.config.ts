import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    server: {
        allowedHosts: ['*'],
        cors: {
            origin: ['*'],
            methods: ['*'],
            allowedHeaders: ['*'],
            credentials: true,
        },
    },
    build: {
        emptyOutDir: true,
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
    define: {
        "import.meta.env": JSON.stringify(process.env),
    },
})
