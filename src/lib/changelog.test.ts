import { describe, expect, it } from 'vitest'
import changelog from '../../CHANGELOG.md?raw'
import { parseChangelog } from './changelog'

describe('parseChangelog', () => {
  it('reads releases newest first and skips Unreleased', () => {
    const releases = parseChangelog(
      [
        '# Changelog',
        'Intro.',
        '## Unreleased',
        '- Coming soon',
        '## 1.1.0 — 2026-10-01',
        '- New thing',
        '- Fixed thing',
        '## 1.0.0 — 2026-09-26',
        'The first release.',
        '- Everything',
      ].join('\n\n'),
    )
    expect(releases).toEqual([
      { version: '1.1.0', date: '2026-10-01', summary: '', changes: ['New thing', 'Fixed thing'] },
      {
        version: '1.0.0',
        date: '2026-09-26',
        summary: 'The first release.',
        changes: ['Everything'],
      },
    ])
  })

  it('has an entry for the version in package.json', () => {
    const releases = parseChangelog(changelog)
    expect(releases[0]?.version).toBe(__APP_VERSION__)
    expect(releases[0]?.changes.length).toBeGreaterThan(0)
  })
})
