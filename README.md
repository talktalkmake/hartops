# hartops.com

Single-page static site for Hart Ops. Plain HTML, Tailwind v4 (CSS-first config), one tiny build step.

## What lives where

- `index.html` — every word of copy, plus Tailwind utility classes for layout/styling. Edit here.
- `src/input.css` — Tailwind directives (`@import "tailwindcss";`), the `@theme` block (palette + fonts), and a few custom rules (timeline counter, marker lists, sticky header). Edit here when changing tokens or adding components.
- `styles.css` — **built output** from the Tailwind CLI. **Do not edit by hand** — your changes will be overwritten on the next build. Committed to the repo so GitHub Pages serves it directly.
- `script.js` — form handler and the footer year.
- `assets/img/` — drop images in here. The page references `tom-hart.jpg`, `hart-ops-logo.svg`, `pillars.png`, and three testimonial portraits — see `legacy-content.md` for the full list. Missing images are removed from the page automatically rather than showing broken icons.
- `CNAME` — the custom domain. Don't change unless the domain changes.
- `tools/tailwindcss.exe` — the Tailwind v4 standalone binary (gitignored — see install instructions below).
- `legacy-content.md` — what was kept verbatim from the old Squarespace site, what was added, and what's still on you to review.

## Install (first-time setup)

The Tailwind CLI is a single ~50MB binary. It's gitignored so each developer fetches their own. From the repo root:

```sh
mkdir -p tools
curl -sL -o tools/tailwindcss.exe \
  https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-windows-x64.exe
```

For macOS/Linux replace `tailwindcss-windows-x64.exe` with `tailwindcss-macos-arm64`, `tailwindcss-macos-x64`, or `tailwindcss-linux-x64`, and drop the `.exe` from the local filename. There is no Node, no `npm`, no `package.json`.

## How to edit

For most edits (copy, classnames, structure):

1. Edit `index.html` (or `src/input.css` if you're changing tokens / adding a component).
2. Run the build:

   ```sh
   ./tools/tailwindcss.exe -i src/input.css -o styles.css --minify
   ```

   Or while iterating, run it in watch mode (rebuilds on every save):

   ```sh
   ./tools/tailwindcss.exe -i src/input.css -o styles.css --watch
   ```

3. Commit `index.html`, `styles.css`, and (if changed) `src/input.css` together.
4. Push to `main`. GitHub Pages redeploys in ~1 minute.

**Always commit the rebuilt `styles.css` alongside the source change.** GitHub Pages serves the static file as-is and has no idea Tailwind exists.

## Tailwind theme tokens

Defined in `@theme` at the top of `src/input.css`. They become first-class Tailwind utilities — `bg-cream`, `text-ink`, `bg-blue`, `bg-yellow`, `font-heading`, `font-body`, etc.

| Token | Hex | Used as |
|---|---|---|
| `--color-cream` | `#E7E4D6` | Page background |
| `--color-ink` | `#2C2E27` | Body text |
| `--color-blue` | `#047AFF` | Primary accent, links, theme-dark sections, pillar headings, timeline circles |
| `--color-yellow` | `#ECF251` | Button fill, theme-dark accent |
| `--color-canary` | `#FDFD96` | Accent, sometimes you need less contrast than --color-yellow |

Three sections invert the palette via the `theme-dark` class (blue bg + white text — outcome and contact sections) or `theme-black` (olive-black + cream text — testimonials).

## Fonts

Four Google Fonts are loaded via `<link>` in `index.html`, mirroring the live Squarespace site:

- **Newsreader** (400, 500) — headings (`font-heading` / inherited from `h1`/`h2`/`h3`)
- **PT Serif** (400, 400 italic, 700) — body copy (`font-body` / inherited from `body`)
- **Roboto Condensed** (400, 500) — primary buttons, form labels, footer, testimonial captions (`font-meta`)
- **Abel** — header brand wordmark and Contact link only (`font-ui`)

To add a weight or family: edit the `fonts.googleapis.com/css2?...` URL in `index.html` AND update the matching `--font-*` token in `src/input.css`, then rebuild.

## Contact form

Powered by [Web3Forms](https://web3forms.com). The access key is embedded as a hidden input in the form on `index.html` (search for `access_key`). Submissions arrive in your email inbox.

To change where submissions go: log into Web3Forms with the email tied to the key, update the destination there. To rotate the key: generate a new one, update the `value` of the hidden `access_key` input, commit. **If you change anything about the form (provider, fields, key), update this README in the same commit.**

A honeypot field (`botcheck`) is included for spam — bots tend to fill every field, so any submission with that field set is silently dropped client-side. Web3Forms also has hCaptcha available in their dashboard if spam volume warrants it.

## Blog

Posts live at `hartops.com/blog/<slug>/` and are written in **Markdown**. The blog is fully static and **completely separate from the home page**: it has its own stylesheet (`blog/blog.css`) and never touches `index.html` or the site-wide `styles.css`.

### Write a post

1. Create `blog/posts/<slug>.md`. **The file name is the slug — it becomes the URL** (`blog/posts/the-margin-leak.md` → `/blog/the-margin-leak/`). Lowercase words, hyphens.
2. Start with a frontmatter block, then write Markdown:

   ```md
   ---
   title: Your post title
   date: 2026-06-23
   description: One sentence — used for SEO and the index card.
   ---

   Your post in Markdown…
   ```

3. Build:

   ```sh
   node tools/build-blog.js
   ```

   That writes `blog/<slug>/index.html`, regenerates `blog/index.html` (the listing, newest first), and updates `sitemap.xml`. Markdown is rendered by the vendored `tools/marked.min.js` (MIT, committed) — no npm.

4. Commit the new `.md`, the generated `blog/<slug>/index.html`, the updated `blog/index.html` + `sitemap.xml`, and push. Pages redeploys in ~1 minute.

You do **not** rebuild any CSS for a new post — post styling comes from the `.post-body` rules baked into `blog/blog.css`. Only regenerate `blog/blog.css` if you change the post template (`tools/build-blog.js`) or the `.post-body` rules in `src/input.css`:

```sh
./tools/tailwindcss.exe -i src/input.css -o blog/blog.css --minify
```

**URL permanence:** the slug (file name) is the permanent URL — don't rename a published post's `.md`.

> Note: the home page footer does not yet link to this blog (kept the home page untouched on purpose). Add a `/blog/` link to the footer in `index.html` whenever you want it surfaced.

## Hosting

GitHub Pages, served from `main` branch root. Custom domain `hartops.com` configured via:
- `CNAME` file in repo
- Apex A records at the registrar pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `www` CNAME at the registrar pointing to `talktalkmake.github.io`

HTTPS is provided automatically by GitHub Pages once DNS resolves.

## What this site doesn't have, on purpose

No analytics, no cookies, no tracking pixels, no newsletter signup, no booking integration, no auth, no CMS, no `package.json`, no `node_modules`. (The blog — see above — is plain static HTML built from Markdown, in keeping with all of that.)

If you want analytics later, [Plausible](https://plausible.io) is the recommended add — it's cookie-free, so no cookie banner is needed.
