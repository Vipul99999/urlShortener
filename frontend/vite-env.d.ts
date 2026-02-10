VITE_API_URL="http://localhost:4000"
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: "http://localhost:4000";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
