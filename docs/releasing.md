# Releasing

How versions work and how to publish a new one.

## Version numbers

Versions are `MAJOR.MINOR.PATCH` ([semantic versioning](https://semver.org)), set in `package.json` and shown in the app's sidebar ("v1.2.0 · What's new").

| Change | Bump | Example |
|---|---|---|
| Only bug fixes | patch | 1.2.0 → 1.2.1 |
| New features or improvements (the usual release) | minor | 1.2.1 → 1.3.0 |
| Something people rely on is removed or works in a way that breaks their habits or projects, or a big redesign | major | 1.3.0 → 2.0.0 |

A save format bump (`FORMAT_VERSION`, see [save-format.md](save-format.md)) isn't breaking by itself, because old projects still open. But files saved by the new version won't open in older versions of the app, so say so in the changelog entry.

## Keeping the changelog

`CHANGELOG.md` lists what changed in each release, and the app shows it in its "What's new" panel. So:

- **Every user-facing change adds a line under `## Unreleased`** in the same change that makes it. Write it for people using the app, not for developers: "Copy and paste parts between projects", not "Add clipboard store".
- Bug fixes count too ("Fixed: …"). Internal changes (refactors, tests, docs) don't need a line.
- Keep the format: `## <version> — <date>` headings, optional summary lines, and `- ` lines. The app's parser (`src/lib/changelog.ts`) only understands that.

## When to release

Not after every feature: a release bundles whatever is under "Unreleased". Release when there's something worth telling people about (a bigger feature, or a few smaller ones, or every couple of weeks), and ship urgent fixes straight away as a patch. The version is bumped once per release, however many changes it holds.

## Publishing a release

1. Make sure everything is committed and "Unreleased" in `CHANGELOG.md` lists the changes.
2. Run **`pnpm release minor`** (or `patch`, `major`, or an exact version like `1.4.0`). Add `--dry-run` first to see what it would do. It:
   - refuses if there are uncommitted changes, "Unreleased" is empty, or the version isn't newer or already tagged,
   - renames `## Unreleased` to `## <version> — <today>` and adds a fresh empty `## Unreleased` above it,
   - sets `"version"` in `package.json`,
   - runs `pnpm test`, `pnpm lint` and `pnpm build`,
   - commits `release v<version>` and tags `v<version>`.
3. Push: **`git push --follow-tags`**.
4. The **Release** GitHub Action (`.github/workflows/release.yml`) runs on the tag: it checks the tag matches `package.json`, runs the tests, lint and build, and creates the GitHub release with that version's changelog lines as notes and a zip of the built app (for self-hosting) attached. People watching the repository get notified.

The Action never edits `CHANGELOG.md`: the tag must point at a commit that already has the finished changelog and version, which is why `pnpm release` does that before tagging.

## Deploying

boardcut.app is deployed by Cloudflare's Git integration (Workers Builds) on **every push to `main`**, not on releases: it runs `pnpm build` with `SITE_URL=https://boardcut.app` and then `npx wrangler deploy`, which uploads `dist/` as set in `wrangler.jsonc`. Other branches get preview links. So only push to `main` what's ready to go live; the version number and "What's new" change only when you release.

## What people see

- The sidebar shows the version they're running, with a "What's new" link to the changelog.
- The first time they open the app after an update, a one-time notice says "Updated to v<version>" with a link to what's new. On a first visit there's no notice.
- If the app crashes, the crash screen shows the version, for bug reports.
