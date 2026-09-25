import { useEffect } from 'react'
import { Sidebar } from './ui/Sidebar'
import { Canvas2D } from './canvas/Canvas2D'
import { Inspector } from './ui/Inspector'
import { useUndoShortcuts } from './ui/useUndoShortcuts'
import { useProjectsStore } from './store/useProjectsStore'

export default function App() {
  useUndoShortcuts()

  useEffect(() => {
    void useProjectsStore.getState().init()
  }, [])

  return (
    <div className="app">
      <Sidebar />
      <Canvas2D />
      <Inspector />
    </div>
  )
}
