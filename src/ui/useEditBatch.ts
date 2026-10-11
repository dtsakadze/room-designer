import { useEffect, useRef } from 'react'
import { useDesignStore } from '../store/useDesignStore'

/**
 * Groups the changes made while a field has focus into one undo step: `begin`
 * on focus, `end` on blur. A field removed while it has focus (Escape closing
 * its dialog, the selection changing) gets no blur event from React, so the
 * step is also ended when the field goes; left open, every later change would
 * merge into it.
 */
export function useEditBatch() {
  const open = useRef(false)

  useEffect(
    () => () => {
      if (open.current) useDesignStore.getState().endBatch()
    },
    [],
  )

  return {
    begin: () => {
      open.current = true
      useDesignStore.getState().beginBatch()
    },
    end: () => {
      open.current = false
      useDesignStore.getState().endBatch()
    },
  }
}
