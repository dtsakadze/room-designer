import { Sidebar } from './ui/Sidebar'
import { Canvas2D } from './canvas/Canvas2D'
import { useAutosave } from './ui/useAutosave'
import { useUndoShortcuts } from './ui/useUndoShortcuts'

export default function App() {
  useUndoShortcuts()
  const saveStatus = useAutosave()

  return (
    <div className="app">
      <Sidebar saveStatus={saveStatus} />
      <Canvas2D />
    </div>
  )
}
