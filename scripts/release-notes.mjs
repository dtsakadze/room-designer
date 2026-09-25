// Prints one version's notes from CHANGELOG.md, for the GitHub release.
// Usage: node scripts/release-notes.mjs 1.1.0
import { readFileSync } from 'node:fs'

export function releaseNotes(changelog, version) {
  const section = changelog
    .split(/^## /m)
    .find((part) => part.split('\n')[0].split('—')[0].trim() === version)
  if (!section) return null
  return section.split('\n').slice(1).join('\n').trim()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2]?.replace(/^v/, '')
  const notes = version && releaseNotes(readFileSync('CHANGELOG.md', 'utf8'), version)
  if (!notes) {
    console.error(`No "## ${version} — <date>" entry with notes in CHANGELOG.md`)
    process.exit(1)
  }
  console.log(notes)
}
