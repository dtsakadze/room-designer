import { useMemo } from 'react'
import { cutListReport } from '../lib/cutListReport'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore } from '../store/useSettingsStore'

/** The cut list, banding, hardware and sheet layouts, worked out once per change to the design. */
export function useCutListReport() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const joints = useDesignStore((s) => s.joints)
  const boardSheets = useDesignStore((s) => s.boardSheets)
  const room = useDesignStore((s) => s.room)
  const byWall = useSettingsStore((s) => s.cutListByWall)
  return useMemo(
    () => cutListReport({ pieces, thickness, grainedBoards, joints, boardSheets, room }, byWall),
    [pieces, thickness, grainedBoards, joints, boardSheets, room, byWall],
  )
}
