import { Component, type ComponentType, Suspense, lazy } from 'react'

type State = { error: Error | null; Preview: ComponentType }

// three.js is big, so the 3D preview only downloads when it's first opened.
const load = () => lazy(() => import('./Preview3D'))

/**
 * The 3D preview, downloaded on first use, with any failure kept to itself.
 * Without WebGL (some graphics cards, virtual machines, remote desktops)
 * creating the renderer throws, and the preview's code can fail to download
 * (offline, or a tab left open over an update). Either would otherwise reach
 * the CrashScreen and take the whole editor down with it. A failed download
 * stays failed in `lazy`, so Try again starts a fresh one.
 */
export class Preview3DLoader extends Component<object, State> {
  state: State = { error: null, Preview: load() }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('The 3D preview failed', error)
  }

  render() {
    const { error, Preview } = this.state
    if (!error) {
      return (
        <Suspense fallback={<p className="viewport-hint">Loading 3D preview…</p>}>
          <Preview />
        </Suspense>
      )
    }
    return (
      <div className="preview-error" role="alert">
        <p>
          The 3D preview couldn't start in this browser. Your design is fine, and the other views
          still work.
        </p>
        <button
          type="button"
          className="ghost-button"
          onClick={() => this.setState({ error: null, Preview: load() })}
        >
          Try again
        </button>
      </div>
    )
  }
}
