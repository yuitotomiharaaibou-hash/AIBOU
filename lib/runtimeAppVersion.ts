// Metro が app.json を解決（Single source of truth with app.json "expo.version"）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("../app.json") as { expo?: { version?: string } };

export const RUNTIME_APP_VERSION: string = appJson.expo?.version ?? "1.0.0";
