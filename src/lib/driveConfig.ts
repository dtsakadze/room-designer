/**
 * The Google Cloud project this copy of the app syncs through, set when the
 * app is built (VITE_GOOGLE_CLIENT_ID, and for choosing a folder
 * VITE_GOOGLE_API_KEY and VITE_GOOGLE_APP_ID, the project number). None of them
 * is a secret: they identify the app and ship in the page. Without a client
 * id there is no Drive sync and nothing about it shows, as with SITE_URL.
 */
const env = import.meta.env as Record<string, string | undefined>

const value = (name: string) => env[name]?.trim() || null

export const driveConfig = {
  clientId: value('VITE_GOOGLE_CLIENT_ID'),
  apiKey: value('VITE_GOOGLE_API_KEY'),
  appId: value('VITE_GOOGLE_APP_ID'),
}

/** Drive sync is available in this build. */
export const driveAvailable = driveConfig.clientId !== null

/** People can choose the folder; without the key and app id the folder is made in My Drive. */
export const canPickFolder = driveConfig.apiKey !== null && driveConfig.appId !== null
