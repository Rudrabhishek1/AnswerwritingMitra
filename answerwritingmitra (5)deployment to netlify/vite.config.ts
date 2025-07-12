import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This makes process.env available to the client-side code,
    // which is necessary for the Gemini API service to access the API_KEY.
    'process.env': process.env
  }
})
