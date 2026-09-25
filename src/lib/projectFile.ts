import { type ProjectData, readProject } from './project'

/** Downloads the project as a readable JSON file. */
export function downloadProject(project: ProjectData) {
  const json = JSON.stringify(project, null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  // Named after the project, minus characters file systems reject.
  const base = project.name?.replace(/[\\/:*?"<>|]+/g, ' ').trim()
  link.download = `${base || `room-design-${localDate(new Date(project.savedAt))}`}.json`
  link.click()
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Reads a file picked by the user into a project. Throws with a message that
 * can be shown as-is when the file isn't one this version can open.
 */
export async function readProjectFile(file: File): Promise<ProjectData> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error(`${file.name} isn't a project file (it isn't valid JSON).`)
  }

  const result = readProject(data)
  if (result.ok) return result.project
  throw new Error(
    result.problem === 'newer'
      ? `${file.name} was saved by a newer version of the app. Update to open it.`
      : `${file.name} isn't a room designer project, or it's damaged.`,
  )
}

/** YYYY-MM-DD in the user's own time zone (`toISOString` would give UTC). */
const localDate = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
