import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import changelog from '../../CHANGELOG.md?raw'
import { parseChangelog } from './changelog'

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

/**
 * Each release tag (v1.2.3) with CHANGELOG.md as it had it. None without git
 * or tags (a release zip, a shallow clone); tags from before the changelog
 * are left out.
 */
function releasedChangelogs(): [string, string][] {
  let tags: string[]
  try {
    tags = git('tag', '--list', 'v*.*.*').split('\n').filter(Boolean)
  } catch {
    return []
  }
  return tags.flatMap((tag): [string, string][] => {
    try {
      return [[tag, git('show', `${tag}:CHANGELOG.md`)]]
    } catch {
      return []
    }
  })
}

const released = releasedChangelogs()

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

describe('released changelog sections', () => {
  // Each release's notes are what it shipped and showed in "What's new", so
  // they must stay as they were when it was tagged. A later change gets its
  // own line under Unreleased.
  it.skipIf(released.length === 0).each(released)('keeps %s as it was released', (tag, markdown) => {
    const version = tag.slice(1)
    const then = parseChangelog(markdown).find((release) => release.version === version)
    // Tags from before the changelog have nothing to compare.
    if (!then) return
    const now = parseChangelog(changelog).find((release) => release.version === version)
    expect(now, `${version} was released but is missing from CHANGELOG.md`).toEqual(then)
  })
})
