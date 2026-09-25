import { Component, type ErrorInfo, type ReactNode } from 'react'

type State = { error: Error | null }

/**
 * Shown instead of a blank page when something in the app throws while
 * drawing. Projects are autosaved in the browser, so a reload is safe. React
 * only catches these with a class component, hence the one class in the app.
 */
export class CrashScreen extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Room Designer crashed', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <h1>Something went wrong</h1>
          <p>
            Your projects are saved in this browser, so reloading is safe. The very last change
            may not have been saved.
          </p>
          <button type="button" className="add-button" onClick={() => window.location.reload()}>
            Reload
          </button>
          <details>
            <summary>Details for a bug report (v{__APP_VERSION__})</summary>
            <pre>{error.stack ?? error.message}</pre>
          </details>
        </div>
      </div>
    )
  }
}
