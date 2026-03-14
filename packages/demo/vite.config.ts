import { defineConfig } from "vite"
import path from "path"
import fs from "fs"

const nagiAssetsSource = path.join(__dirname, "../bunshin/src/assets/nagi")
const nagiAssetsDest = path.join(__dirname, "public/assets/nagi")

function copyNagiAssets() {
  if (!fs.existsSync(nagiAssetsSource)) return
  fs.mkdirSync(nagiAssetsDest, { recursive: true })
  for (const file of fs.readdirSync(nagiAssetsSource)) {
    if (file.endsWith(".png")) {
      fs.copyFileSync(
        path.join(nagiAssetsSource, file),
        path.join(nagiAssetsDest, file),
      )
    }
  }
}

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
  plugins: [
    {
      name: "bunshin-assets",
      configureServer(server) {
        // Dev: serve from source directory
        server.middlewares.use("/assets/nagi", (req, res, next) => {
          const filePath = path.join(nagiAssetsSource, req.url || "")
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader("Content-Type", "image/png")
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        })
      },
      buildStart() {
        // Build: copy assets to public/ so Vite includes them in dist/
        copyNagiAssets()
      },
      closeBundle() {
        // Clean up copied public assets after build
        if (fs.existsSync(nagiAssetsDest)) {
          fs.rmSync(nagiAssetsDest, { recursive: true })
        }
        // Clean empty parent dirs
        const parentDir = path.join(__dirname, "public/assets")
        if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmSync(parentDir, { recursive: true })
        }
        const publicDir = path.join(__dirname, "public")
        if (fs.existsSync(publicDir) && fs.readdirSync(publicDir).length === 0) {
          fs.rmSync(publicDir, { recursive: true })
        }
      },
    },
  ],
})
