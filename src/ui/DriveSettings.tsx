import { canPickFolder } from '../lib/driveConfig'
import { DRIVE_LABELS, useDriveStore } from '../store/useDriveStore'

/** Connect Google Drive: every project is kept in a Boardcut folder there, and changes go both ways. */
export function DriveSettings() {
  const { connected, status, message, lastSyncedAt, parentName, connect, reconnect, disconnect, syncNow } =
    useDriveStore()
  const busy = status === 'syncing'

  if (!connected) {
    return (
      <section className="section">
        <h2>Google Drive</h2>
        <p className="hint">
          Keeps every project in a Boardcut folder in your Google Drive and updates it with each change, so your
          projects are backed up and open on your other devices too.
          {canPickFolder
            ? ' You choose the folder it goes in.'
            : ' The folder is made in My Drive.'}{' '}
          Boardcut can only see the files it makes there, not the rest of your Drive. <a href="privacy.html" target="_blank" rel="noreferrer">Privacy policy</a>.
        </p>
        <button type="button" className="ghost-button" disabled={busy} onClick={() => void connect()}>
          Connect Google Drive
        </button>
        {message && <p className="hint hint-error">{message}</p>}
      </section>
    )
  }

  return (
    <section className="section">
      <h2>Google Drive</h2>
      <p className="hint">
        Connected: projects are in the <strong>Boardcut</strong> folder in {parentName}. Each project is one file,
        sent after every change; changes made on another device are fetched about once a minute and when you come back to this tab.
        Deleting a project here moves its file to the Drive trash. If a project changed in both places, Drive&apos;s
        version is kept as a copy.
      </p>
      <p className={status === 'error' || status === 'reconnect' ? 'hint hint-error' : 'hint'}>
        <strong>{DRIVE_LABELS[status]}</strong>
        {lastSyncedAt && status === 'idle' && ` at ${new Date(lastSyncedAt).toLocaleTimeString()}`}
        {message && `: ${message}`}
      </p>
      <div className="drive-actions">
        {status === 'reconnect' ? (
          <button type="button" className="ghost-button" onClick={() => void reconnect()}>
            Reconnect
          </button>
        ) : (
          <button type="button" className="ghost-button" disabled={busy} onClick={() => void syncNow()}>
            Sync now
          </button>
        )}
        {canPickFolder && (
          <button type="button" className="ghost-button" disabled={busy} onClick={() => void connect()}>
            Change folder
          </button>
        )}
        <button type="button" className="ghost-button" onClick={disconnect}>
          Disconnect
        </button>
      </div>
      <p className="hint">Disconnecting stops syncing. Nothing is deleted here or in Drive.</p>
    </section>
  )
}
