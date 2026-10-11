// Prints one version's notes from CHANGELOG.md, for the GitHub release.
// Usage: node --experimental-strip-types scripts/release-notes.mjs 1.1.0
// (the flag lets Node load the app's own changelog reader, which is TypeScript;
// Node 22.18 and later do that without it)
import { readFileSync } from 'node:fs'
import { parseChangelog } from '../src/lib/changelog.ts'

export function releaseNotes(changelog, version) {
  const release = parseChangelog(changelog).find((entry) => entry.version === version)
  if (!release || (!release.summary && release.changes.length === 0)) return null
  return [release.summary, release.changes.map((change) => `- ${change}`).join('\n')].filter(Boolean).join('\n\n')
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
