import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    server: {
        allowedHosts: ['*'],
        cors: {
            // origin: ['self', 'http://api:3000/*'],
            origin: ['*'],
            methods: ['*'],
            allowedHeaders: ['*'],
            credentials: true,
        },
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
})
