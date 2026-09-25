export type Release = { version: string; date: string; summary: string; changes: string[] }

/**
 * Reads CHANGELOG.md into releases, newest first, skipping "Unreleased". It
 * understands just the file's own format: `## <version> — <date>` headings,
 * optional summary lines, and `- ` change lines.
 */
export function parseChangelog(markdown: string): Release[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .flatMap((section): Release[] => {
      const [heading, ...lines] = section.split('\n')
      const [version, date = ''] = heading.split('—').map((part) => part.trim())
      if (!/^\d+\.\d+\.\d+$/.test(version)) return []
      const text = lines.map((line) => line.trim()).filter(Boolean)
      return [
        {
          version,
          date,
          summary: text.filter((line) => !line.startsWith('- ')).join(' '),
          changes: text.filter((line) => line.startsWith('- ')).map((line) => line.slice(2)),
        },
      ]
    })
}
