import { useEffect } from 'react'
import { Sidebar } from './ui/Sidebar'
import { Canvas2D } from './canvas/Canvas2D'
import { Inspector } from './ui/Inspector'
import { RotateHint } from './ui/RotateHint'
import { useUndoShortcuts } from './ui/useUndoShortcuts'
import { useProjectsStore } from './store/useProjectsStore'
import { useDesignStore } from './store/useDesignStore'
import { useLayoutStore } from './store/useLayoutStore'

export default function App() {
  useUndoShortcuts()

  useEffect(() => {
    void useProjectsStore.getState().init()
  }, [])

  // On a small screen the panels slide over the drawing; these classes say
  // which are out. The CSS ignores them on a wide screen.
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const folded = useLayoutStore((s) => s.inspectorFolded)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const hasSelection = useDesignStore((s) => s.selectedIds.length > 0)
  const className = [
    'app',
    sidebarOpen && 'sidebar-open',
    hasSelection && 'has-selection',
    folded && 'inspector-folded',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <Sidebar />
      {/* Taps beside the open sidebar close it, as on any phone app. */}
      <div className="drawer-backdrop" aria-hidden onPointerDown={() => setSidebarOpen(false)} />
      <Canvas2D />
      <Inspector />
      <RotateHint />
    </div>
  )
}
