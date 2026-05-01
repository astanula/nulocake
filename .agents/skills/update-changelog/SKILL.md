---
name: update-changelog
description: Update the project changelog (CHANGELOG.md) with changes from the current session. This skill is MANUAL-ONLY — only invoke when the user explicitly asks. Typical usage is at the end of a coding session to record what was done. It determines the semantic version bump, writes a compact entry to CHANGELOG.md, and creates a detailed release notes file in .changelog/. Use when the user says "update changelog", "record changes", "log what we did", "write changelog entry", or asks to document the session's work in a changelog. Do NOT auto-trigger this skill — wait for explicit invocation.
---

# Update Changelog

Record the changes from the current session into a structured changelog. This skill produces two outputs:

1. **`CHANGELOG.md`** — a compact, scannable list of versions with dates and short summaries
2. **`.changelog/<version>.<date>.md`** — a detailed breakdown of what changed in each version

The idea is that CHANGELOG.md stays clean and browsable (one line per release), while the full story lives in separate files that anyone can drill into when they need detail.

## When to use this

This skill is strictly manual. The user will invoke it — typically at the end of a session — when they want to capture what was done. Never invoke it automatically.

---

## Step-by-step process

### 1. Gather what changed

Review the current conversation to understand what happened in this session:

- What files were created, modified, or deleted
- What features were added
- What bugs were fixed
- What breaking changes were introduced
- The *intent* behind each change — not just "edited file X" but *why*

**Default: use conversation context.** The conversation captures intent and reasoning, which makes for better changelog entries than raw diffs. Only use `git diff` or `git log` if the user explicitly asks for it.

### 2. Determine the version

This project follows [Semantic Versioning](https://semver.org/):

| Bump | When | Example |
|------|------|---------|
| **MAJOR** | Incompatible or breaking changes | Removing a public API, changing a data format |
| **MINOR** | New functionality, backward compatible | Adding a new page section, new component |
| **PATCH** | Backward compatible bug fixes | Fixing a layout glitch, correcting a typo |

When changes span multiple categories (e.g., new features + bug fixes), use the highest applicable bump — MINOR beats PATCH, MAJOR beats both.

**Finding the current version:**

- Read just the **top ~20 lines** of `CHANGELOG.md` — the newest entry is always first, so there's no need to read the whole file
- Parse the version from the first list entry (e.g., `- [0.2.0] - 2026-05-01: ...` → current version is `0.2.0`)
- If `CHANGELOG.md` doesn't exist yet, start at `0.1.0`

**Do not ask the user for confirmation.** Determine the version, write it, and move on. If the user disagrees, they'll ask you to adjust — that's faster than a confirmation prompt every time.

### 3. Write the files

Produce both files in a single pass. Use today's date in `YYYY-MM-DD` format.

---

## Output formats

### CHANGELOG.md

The file has a fixed header followed by a list of version entries, newest first.

```markdown
# CHANGELOG

All notable changes to this project are documented here.
For detailed release notes, see the corresponding file in the `.changelog/` directory.
Each version's details are stored in `.changelog/<version>.<date>.md`.

- [0.3.0] - 2026-05-01: Accessibility improvements
- [0.2.0] - 2026-04-15: Hero section redesign
- [0.1.0] - 2026-04-09: Initial landing page
```

**Format rules:**

- Each entry is exactly one line: `- [<version>] - <YYYY-MM-DD>: <short summary>`
- The short summary is a concise title (a few words) — not a full sentence
- New entries go immediately after the header block, before all existing entries
- When creating the file for the first time, include the full header as shown above
- When updating an existing file, preserve the header and insert the new entry at the top of the list

### Detail file: `.changelog/<version>.<YYYY-MM-DD>.md`

```markdown
# 0.2.0 - 2026-04-15: Hero section redesign

## Added
- Scroll-driven hero video animation synced to scroll position
- Mobile-responsive fallback layout for the hero section

## Changed
- Hero section now uses a split-screen architecture (`src/layouts/SplitLayout.astro`)
- Text content anchored to the left half of the viewport

## Fixed
- Video playback stuttering on Safari due to missing codec hint
```

**Format rules:**

- Filename: `<version>.<YYYY-MM-DD>.md` — for example `0.2.0.2026-04-15.md`
- The `# title` line matches the CHANGELOG.md entry exactly
- Use [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories as `##` sections:
  - **Added** — new features or files
  - **Changed** — modifications to existing functionality
  - **Deprecated** — features marked for future removal
  - **Removed** — features or files that were deleted
  - **Fixed** — bug fixes
  - **Security** — vulnerability patches
- Only include categories that have entries — skip empty ones entirely
- Each bullet should describe *what* changed and *why* it matters, in plain language
- File references: include sparingly (2–3 max per release), and only when the file itself is the notable change — for example, a new image was added or a key config file was created. Most bullets should be purely descriptive without file paths.

---

## Edge cases

| Situation | What to do |
|-----------|------------|
| No `CHANGELOG.md` exists | Create it with the full header + first entry. Start at version `0.1.0`. |
| No `.changelog/` directory exists | Create it. |
| Session had no meaningful changes | Tell the user there's nothing notable to log. Don't create empty entries. |
| User explicitly asks for git diff | Run `git diff` or `git log` and use that as the source of changes instead of (or alongside) conversation context. |
| User wants to correct the version | Update both `CHANGELOG.md` entry and rename the detail file accordingly. |
| Multiple sessions on the same day | Each gets its own version bump — the version number differentiates them even if the date is the same. |

---

## Example walkthrough

Imagine a session where the agent:
- Added a new "About" section to the landing page
- Created `src/components/About.astro` and `src/assets/about-photo.jpg`
- Fixed a broken navigation link in the header

The skill would:

1. Read the top of CHANGELOG.md, find the latest version is `0.2.0`
2. Classify: new feature (About section) → MINOR bump → `0.3.0`
3. Write to CHANGELOG.md:
   ```
   - [0.3.0] - 2026-05-01: About section and nav fix
   ```
4. Create `.changelog/0.3.0.2026-05-01.md`:
   ```markdown
   # 0.3.0 - 2026-05-01: About section and nav fix

   ## Added
   - New "About" section with team photo and business story (`src/assets/about-photo.jpg`)
   - About component with scroll-reveal animation

   ## Fixed
   - Broken navigation link to the gallery section in the header
   ```
