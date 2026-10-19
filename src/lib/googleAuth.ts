import { AuthError } from './drive'
import { driveConfig } from './driveConfig'

/**
 * Signing in to Google and choosing a folder, both with Google's own scripts,
 * loaded when first needed. Browser-only, so it has no unit tests.
 *
 * Only the `drive.file` scope is asked for: the app can reach the files and
 * folders it made or that the person chose, nothing else in their Drive. There
 * is no server to hold a refresh token, so an access token lasts about an hour
 * and is renewed quietly; where the browser blocks that, the person is asked
 * to reconnect with one click.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
/** A token this close to running out is renewed first. */
const MARGIN_MS = 60_000
const QUIET_TIMEOUT_MS = 15_000

type TokenResponse = { access_token?: string; expires_in?: number | string; error?: string }
type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void }
type GoogleWindow = {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string
          scope: string
          callback: (response: TokenResponse) => void
          error_callback: (error: { type?: string }) => void
        }) => TokenClient
        revoke: (token: string, done?: () => void) => void
      }
    }
    picker?: PickerApi
  }
  gapi?: { load: (api: string, callback: () => void) => void }
}
type PickerResult = { action: string; docs?: { id: string; name: string }[] }
type PickerApi = {
  ViewId: { FOLDERS: string }
  Action: { PICKED: string; CANCEL: string }
  DocsView: new (viewId: string) => { setSelectFolderEnabled: (on: boolean) => unknown; setMimeTypes: (types: string) => unknown }
  PickerBuilder: new () => PickerBuilder
}
type PickerBuilder = {
  addView: (view: unknown) => PickerBuilder
  setOAuthToken: (token: string) => PickerBuilder
  setDeveloperKey: (key: string) => PickerBuilder
  setAppId: (id: string) => PickerBuilder
  setTitle: (title: string) => PickerBuilder
  setCallback: (callback: (result: PickerResult) => void) => PickerBuilder
  build: () => { setVisible: (visible: boolean) => void }
}

const google = () => (window as unknown as GoogleWindow).google

const scripts = new Map<string, Promise<void>>()
function loadScript(src: string) {
  let loading = scripts.get(src)
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        scripts.delete(src)
        reject(new Error('Could not load Google sign-in'))
      }
      document.head.append(script)
    })
    scripts.set(src, loading)
  }
  return loading
}

let current: { token: string; expiresAt: number } | null = null
let client: TokenClient | null = null
/** The request waiting for Google's answer; the client reports to whichever is open. */
let waiting: { resolve: (token: string) => void; reject: (error: Error) => void } | null = null

async function tokenClient() {
  if (client) return client
  await loadScript('https://accounts.google.com/gsi/client')
  const oauth2 = google()?.accounts?.oauth2
  if (!oauth2 || !driveConfig.clientId) throw new AuthError('Google sign-in is not available')
  client = oauth2.initTokenClient({
    client_id: driveConfig.clientId,
    scope: SCOPE,
    callback: (response) => {
      const open = waiting
      waiting = null
      if (!response.access_token) return open?.reject(new AuthError(response.error ?? 'Google did not sign you in'))
      current = { token: response.access_token, expiresAt: Date.now() + Number(response.expires_in ?? 3600) * 1000 }
      open?.resolve(response.access_token)
    },
    error_callback: (error) => {
      const open = waiting
      waiting = null
      open?.reject(new AuthError(error.type === 'popup_closed' ? 'The Google window was closed' : 'Could not open Google sign-in'))
    },
  })
  return client
}

/**
 * Asks Google for a token. `consent` shows the sign-in and permission window
 * (call it from a click, or the browser blocks the window); `quiet` renews
 * without one, which only works where the person is still signed in and has
 * agreed before.
 */
export async function signIn(mode: 'consent' | 'quiet'): Promise<string> {
  const requester = await tokenClient()
  return new Promise<string>((resolve, reject) => {
    waiting?.reject(new AuthError('Another sign-in started'))
    // A quiet renewal the browser blocks can go unanswered, so it gives up.
    const giveUp = mode === 'quiet' ? setTimeout(() => reject(new AuthError('Google did not answer')), QUIET_TIMEOUT_MS) : null
    const done = <T,>(finish: (value: T) => void) => (value: T) => {
      clearTimeout(giveUp ?? undefined)
      finish(value)
    }
    waiting = { resolve: done(resolve), reject: done(reject) }
    requester.requestAccessToken({ prompt: mode === 'consent' ? 'consent' : '' })
  })
}

/** A token with time left on it, renewed quietly when it has run out. */
export async function accessToken(): Promise<string> {
  if (current && current.expiresAt - MARGIN_MS > Date.now()) return current.token
  return signIn('quiet')
}

/** Whether a token is held without asking Google. */
export const signedIn = () => !!current && current.expiresAt - MARGIN_MS > Date.now()

/** Drops the token and tells Google it's no longer wanted. */
export function signOut() {
  const token = current?.token
  current = null
  if (token) google()?.accounts?.oauth2?.revoke(token)
}

/** The folder the person chose in Google's folder picker, or null when they closed it. */
export async function pickFolder(token: string): Promise<{ id: string; name: string } | null> {
  const { apiKey, appId } = driveConfig
  if (!apiKey || !appId) return null
  await loadScript('https://apis.google.com/js/api.js')
  const gapi = (window as unknown as GoogleWindow).gapi
  if (!gapi) throw new Error('Could not load the Google folder picker')
  await new Promise<void>((resolve) => gapi.load('picker', resolve))
  const picker = google()?.picker
  if (!picker) throw new Error('Could not load the Google folder picker')
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
    view.setSelectFolderEnabled(true)
    view.setMimeTypes('application/vnd.google-apps.folder')
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setTitle('Choose where to keep the Boardcut folder')
      .setCallback((result) => {
        if (result.action === picker.Action.PICKED && result.docs?.[0]) {
          resolve({ id: result.docs[0].id, name: result.docs[0].name })
        } else if (result.action === picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()
      .setVisible(true)
  })
}
