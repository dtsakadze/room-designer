// Prepares a release locally: turns "## Unreleased" in CHANGELOG.md into the
// new version, sets it in package.json, commits and tags. Pushing is left to
// you (`git push --follow-tags`); the GitHub Action then publishes the release.
//
// Usage: pnpm release <patch|minor|major|x.y.z> [--dry-run]
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const bump = args.find((arg) => !arg.startsWith('--'))

const run = (command) => execSync(command, { stdio: 'inherit' })
const output = (command) => execSync(command, { encoding: 'utf8' }).trim()
const fail = (message) => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (!bump) fail('Say which release: pnpm release <patch|minor|major|x.y.z> [--dry-run]')

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const next =
  bump === 'major'
    ? `${major + 1}.0.0`
    : bump === 'minor'
      ? `${major}.${minor + 1}.0`
      : bump === 'patch'
        ? `${major}.${minor}.${patch + 1}`
        : bump.replace(/^v/, '')

if (!/^\d+\.\d+\.\d+$/.test(next)) {
  fail(`"${bump}" isn't patch, minor, major or a version like 1.2.0`)
}
const current = [major, minor, patch]
const newer = next
  .split('.')
  .map(Number)
  .reduce((cmp, part, i) => cmp || part - current[i], 0)
if (newer <= 0) fail(`${next} isn't newer than the current ${pkg.version}`)

// Everything that goes into the release must be committed.
if (!dryRun && output('git status --porcelain')) fail('Commit or stash your changes first')
if (output(`git tag --list v${next}`)) fail(`Tag v${next} already exists`)

const changelog = readFileSync('CHANGELOG.md', 'utf8')
// Up to the next release heading, or the end of the file.
const unreleased = changelog.match(/^## Unreleased\n([\s\S]*?)(?=^## |(?![\s\S]))/m)
if (!unreleased) fail('CHANGELOG.md has no "## Unreleased" section')
if (!unreleased[1].trim()) fail('Nothing under "## Unreleased" in CHANGELOG.md to release')

// Today in your own time zone (toISOString would give the UTC date).
const now = new Date()
const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  .map((part) => String(part).padStart(2, '0'))
  .join('-')
const released = changelog.replace(
  /^## Unreleased\n/m,
  `## Unreleased\n\n## ${next} — ${date}\n`,
)

console.log(`Releasing v${next} (was ${pkg.version}), dated ${date}:\n`)
console.log(unreleased[1].trim(), '\n')

if (dryRun) {
  console.log('Dry run: nothing was changed.')
  process.exit(0)
}

writeFileSync('CHANGELOG.md', released)
writeFileSync('package.json', JSON.stringify({ ...pkg, version: next }, null, 2) + '\n')

// The same checks the GitHub Action runs, before anything is committed.
run('pnpm test')
run('pnpm lint')
run('pnpm build')

run('git add CHANGELOG.md package.json')
run(`git commit -m "release v${next}"`)
// Annotated, because `git push --follow-tags` only pushes annotated tags.
run(`git tag -a v${next} -m "release v${next}"`)

console.log(`\n✓ Tagged v${next}. Publish it with: git push --follow-tags`)
