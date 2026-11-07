import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

function serviceWorkerAssets() {
  return {
    name: 'service-worker-assets',
    apply: 'build' as const,
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }, _options: unknown, bundle: Record<string, unknown>) {
      const files = Object.keys(bundle).filter((file) => !file.endsWith('.map') && !file.endsWith('.wasm'))
      this.emitFile({ type: 'asset', fileName: 'service-worker-assets.json', source: JSON.stringify(files) })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerAssets()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  worker: { format: 'es' },
})
