import { Sidebar } from './ui/Sidebar'
import { Canvas2D } from './canvas/Canvas2D'
import { useUndoShortcuts } from './ui/useUndoShortcuts'

export default function App() {
  useUndoShortcuts()

  return (
    <div className="app">
      <Sidebar />
      <Canvas2D />
    </div>
  )
}
