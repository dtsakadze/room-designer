import { useEffect, useState } from 'react'
import { parseProject, toProjectData } from '../lib/project'
import { browserStorage } from '../lib/storage'
import { useDesignStore } from '../store/useDesignStore'

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'unavailable'

/** Waits this long after the last change, so a drag saves once, not per move. */
const SAVE_DELAY = 500

/**
 * Restores the design saved in this browser on startup, then saves it again
 * after every change. A pending save is written straight away when the tab is
 * hidden or closed, so nothing made in the last half second is lost either.
 */
export function useAutosave(): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('loading')

  useEffect(() => {
    const storage = browserStorage()
    let cancelled = false
    let pending = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let unsubscribe: (() => void) | undefined

    const save = async () => {
      clearTimeout(timer)
      pending = false
      try {
        await storage.save(toProjectData(useDesignStore.getState()))
        if (!cancelled && !pending) setStatus('saved')
      } catch (error) {
        console.error('Autosave failed', error)
        if (!cancelled) setStatus('unavailable')
      }
    }

    const flush = () => {
      if (pending) void save()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    storage
      .load()
      .then((stored) => {
        if (cancelled) return
        const project = parseProject(stored)
        if (project) useDesignStore.getState().loadProject(project)
        else if (stored != null) console.warn('Ignoring an autosave this version cannot read', stored)

        setStatus('saved')
        // Only start saving once the old design is back, or the empty starting
        // state would overwrite it.
        unsubscribe = useDesignStore.subscribe((state, previous) => {
          if (state.pieces === previous.pieces && state.thickness === previous.thickness) return
          pending = true
          setStatus('saving')
          clearTimeout(timer)
          timer = setTimeout(save, SAVE_DELAY)
        })
      })
      .catch((error) => {
        // Private windows and blocked site data can refuse IndexedDB. Don't
        // start saving then either: if the read failed for a passing reason,
        // a save could overwrite a design that is still there.
        console.error('Could not open browser storage', error)
        if (!cancelled) setStatus('unavailable')
      })

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      cancelled = true
      flush()
      unsubscribe?.()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return status
}
