import { defineConfig } from "vite"
import path from "path"
import fs from "fs"

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
      name: "serve-bunshin-assets",
      configureServer(server) {
        server.middlewares.use("/assets/nagi", (req, res, next) => {
          const filePath = path.join(
            __dirname,
            "../bunshin/src/assets/nagi",
            req.url || "",
          )
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader("Content-Type", "image/png")
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        })
      },
    },
  ],
})
