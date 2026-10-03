import { type ProjectData, readProject } from './project'

/** Downloads the project as a readable JSON file. */
export function downloadProject(project: ProjectData) {
  const base = fileBase(project.name)
  downloadFile(
    JSON.stringify(project, null, 2),
    `${base || `boardcut-${localDate(new Date(project.savedAt))}`}.json`,
    'application/json',
  )
}

/** A project name made safe for a file name: without the characters file systems reject. */
export const fileBase = (name: string | undefined) => name?.replace(/[\\/:*?"<>|]+/g, ' ').trim() ?? ''

/** Downloads text (or a blob, such as an image) as a file. */
export function downloadFile(content: string | Blob, fileName: string, type: string) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
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
      : `${file.name} isn't a Boardcut project, or it's damaged.`,
  )
}

/** YYYY-MM-DD in the user's own time zone (`toISOString` would give UTC). */
const localDate = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
