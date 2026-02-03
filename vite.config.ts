import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  if (mode === "lib") {
    // Library build configuration
    return {
      build: {
        lib: {
          entry: resolve(__dirname, "src/index.ts"),
          name: "BlockyModelWeb",
          fileName: "blockymodel-web",
        },
        rollupOptions: {
          external: ["three"],
          output: {
            globals: {
              three: "THREE",
            },
          },
        },
        sourcemap: true,
      },
    };
  }

  // Default dev/app build configuration
  return {
    root: ".",
    publicDir: "public",
    build: {
      outDir: "dist",
      sourcemap: true,
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});
