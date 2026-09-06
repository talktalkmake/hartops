'use strict'

/**
 * tools/build-blog.js — turn Markdown posts into the static blog.
 *
 * Pipeline:
 *   blog/posts/<slug>.md   →   blog/<slug>/index.html   (one styled article)
 *                          +   blog/index.html          (regenerated listing)
 *                          +   sitemap.xml              (home + blog + posts)
 *
 * Each post is plain Markdown with a tiny frontmatter block:
 *
 *   ---
 *   title: Your post title
 *   date: 2026-06-23
 *   description: One sentence for SEO + the index card.
 *   ---
 *   Markdown body...
 *
 * The file name is the slug, so the URL is hartops.com/blog/<file-name>/ .
 * No npm: Markdown is rendered by the vendored tools/marked.min.js (MIT).
 *
 * Run:  node tools/build-blog.js
 *
 * The blog has its OWN stylesheet, blog/blog.css, so the site-wide styles.css
 * (and the home page) is never touched. Regenerate blog.css only when you change
 * the post template here or the .post-body rules in src/input.css:
 *   ./tools/tailwindcss.exe -i src/input.css -o blog/blog.css --minify
 */

const fs   = require('fs')
const path = require('path')
const { marked } = require('./marked.min.js')

const ROOT      = path.join(__dirname, '..')
const POSTS_DIR = path.join(ROOT, 'blog', 'posts')
const BLOG_DIR  = path.join(ROOT, 'blog')
const SITE      = 'https://hartops.com'

const esc = (s) => String(s == null ? '' : s)
	.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function parseFrontmatter(raw) {
	const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
	if (!m) throw new Error('missing frontmatter (--- block) at top of post')
	const meta = {}
	for (const line of m[1].split('\n')) {
		const i = line.indexOf(':')
		if (i === -1) continue
		meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
	}
	return { meta, body: m[2] }
}

function formatDate(iso) {
	const [y, mo, d] = iso.split('-').map(Number)
	const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December']
	return `${d} ${MONTHS[mo - 1]} ${y}`
}

const headCommon = (title, description, canonical, ogType) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Tom Hart">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#047AFF">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE}/assets/img/tom-hart.jpg">
<meta property="og:site_name" content="Hart Ops">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/assets/img/hart-ops-logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Abel&family=Newsreader:ital,opsz,wght@0,6..72,400..500;1,6..72,400..500&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Roboto+Condensed:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog/blog.css">`

const header = `<a class="skip-link" href="#main">Skip to main content</a>
<header class="site-header bg-canary z-50">
  <div class="px-6 md:px-8 py-4 flex justify-center">
    <a class="block max-h-[30px]" href="/" aria-label="Hart Ops home"><img class="block max-h-[30px] w-auto" src="/assets/img/hart-ops-logo.svg" alt="Hart Ops" width="122" height="30"></a>
  </div>
</header>`

const footer = `<footer class="py-8 font-meta text-[0.9rem] text-ink tracking-[0.03em]">
  <div class="mx-auto max-w-[1400px] px-6 md:px-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:flex-wrap">
    <p class="m-0">&copy; Tom Hart, <span id="year">2026</span></p>
    <ul class="list-none p-0 m-0 flex gap-5 flex-wrap uppercase">
      <li><a href="/">Home</a></li>
      <li><a href="/blog/">Blog</a></li>
    </ul>
  </div>
</footer>
<script src="/script.js" defer></script>`

function postPage(post) {
	const canonical = `${SITE}/blog/${post.slug}/`
	const ld = {
		'@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
		datePublished: post.date, dateModified: post.date, description: post.description,
		image: `${SITE}/assets/img/tom-hart.jpg`,
		author: { '@type': 'Person', name: 'Tom Hart', url: `${SITE}/` },
		publisher: {
			'@type': 'Organization', name: 'Hart Ops',
			logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/hart-ops-logo.svg` },
		},
		mainEntityOfPage: canonical,
	}
	return `<!doctype html>
<html lang="en">
<head>
${headCommon(`${post.title} — Hart Ops`, post.description, canonical, 'article')}
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body class="bg-cream">
${header}
<main id="main">
  <article>
    <header class="px-6 md:px-8 py-14 md:py-20 bg-white">
      <div class="mx-auto max-w-[68ch]">
        <p class="font-meta uppercase tracking-[0.06em] text-sm text-ink/70 mb-3"><a class="text-ink/70 no-underline hover:text-blue-text" href="/blog/">Field Notes</a> &middot; ${esc(formatDate(post.date))}</p>
        <h1 class="text-4xl md:text-6xl">${esc(post.title)}</h1>
        <p class="text-lg md:text-xl mt-4">${esc(post.description)}</p>
      </div>
    </header>
    <div class="px-6 md:px-8 py-12 md:py-16">
      <div class="post-body mx-auto max-w-[68ch]">
${post.html}
      </div>
    </div>
    <div class="px-6 md:px-8 pb-12">
      <div class="mx-auto max-w-[68ch]">
        <a class="font-meta uppercase tracking-[2px] text-sm text-blue-text no-underline hover:underline" href="/blog/">&larr; All field notes</a>
      </div>
    </div>
  </article>
</main>
${footer}
</body>
</html>
`
}

function indexPage(posts) {
	const canonical = `${SITE}/blog/`
	const items = posts.map(p => `        <li>
          <article class="border-t border-ink/15 py-8 md:py-10">
            <p class="font-meta uppercase tracking-[0.06em] text-sm text-ink/70 mb-2">${esc(formatDate(p.date))}</p>
            <h2 class="text-2xl md:text-4xl mb-3 max-w-[26ch]"><a class="no-underline text-black hover:text-blue-text" href="/blog/${p.slug}/">${esc(p.title)}</a></h2>
            <p class="max-w-[62ch]">${esc(p.description)}</p>
            <a class="inline-block mt-3 font-meta uppercase tracking-[2px] text-sm text-blue-text no-underline hover:underline" href="/blog/${p.slug}/">Read &rarr;</a>
          </article>
        </li>`).join('\n')
	return `<!doctype html>
<html lang="en">
<head>
${headCommon('Field Notes — Hart Ops', 'Field notes on agency profit, operations, and the numbers that actually move margin — from Tom Hart.', canonical, 'website')}
</head>
<body class="bg-cream">
${header}
<main id="top">
  <section class="px-6 md:px-8 py-16 md:py-24 bg-white">
    <div class="mx-auto max-w-[1100px]">
      <p class="font-meta uppercase tracking-[0.08em] text-sm text-ink/70 mb-3">Field Notes</p>
      <h1 class="text-4xl md:text-6xl max-w-[18ch]">The numbers that actually move agency margin.</h1>
      <p class="text-lg md:text-xl max-w-[60ch] mt-4">Short, practical notes on agency profit, operations, and the levers most owners can't see in time to pull. Written for people running a $1M&ndash;$5M shop.</p>
    </div>
  </section>
  <section class="px-6 md:px-8 py-14 md:py-20">
    <div class="mx-auto max-w-[1100px]">
      <ol class="list-none p-0 m-0">
${items}
      </ol>
    </div>
  </section>
</main>
${footer}
</body>
</html>
`
}

function updateHomePage(posts) {
	const homePath = path.join(ROOT, 'index.html')
	if (!fs.existsSync(homePath)) return
	let html = fs.readFileSync(homePath, 'utf8')

	const latest = posts[0]
	const latestLink = latest
		? `Read Tom's latest post: <a class="font-bold" href="/blog/${latest.slug}/">${esc(latest.title)}</a>`
		: ''
	html = replaceMarker(html, 'BUILD:LATEST_POST_LINK', latestLink)

	const items = posts.slice(0, 3).map((p, i) => `        <li>
          <article class="post-card">
            <p class="post-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
            <div>
              <p class="font-meta uppercase tracking-[0.06em] text-sm text-ink/70">${esc(formatDate(p.date))}</p>
              <h3 class="text-xl md:text-2xl"><a class="no-underline text-black hover:text-blue-text" href="/blog/${p.slug}/">${esc(p.title)}</a></h3>
              <p class="max-w-[62ch]">${esc(p.description)}</p>
            </div>
          </article>
        </li>`).join('\n')
	html = replaceMarker(html, 'BUILD:LATEST_POSTS', '\n' + items + '\n        ')

	fs.writeFileSync(homePath, html)
	console.log('✅  index.html (latest-post link + recent writing)')
}

function replaceMarker(html, marker, content) {
	const re = new RegExp(`(<!-- ${marker} -->)[\\s\\S]*?(<!-- /${marker} -->)`)
	return html.replace(re, `$1${content}$2`)
}

function sitemap(posts) {
	const url = (loc, lastmod) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
	const today = new Date().toISOString().slice(0, 10)
	const latest = posts.length ? posts[0].date : today
	const rows = [
		url(`${SITE}/`, '2026-05-25'),
		url(`${SITE}/blog/`, latest),
		...posts.map(p => url(`${SITE}/blog/${p.slug}/`, p.date)),
	]
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`
}

// ── Build ───────────────────────────────────────────────────────────────────

const files = fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')) : []
const posts = files.map(file => {
	const slug = file.replace(/\.md$/, '')
	const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8')
	const { meta, body } = parseFrontmatter(raw)
	if (!meta.title || !meta.date) throw new Error(`${file}: frontmatter needs title and date`)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: date must be YYYY-MM-DD`)
	return { slug, title: meta.title, date: meta.date, description: meta.description || '', html: marked(body).trim() }
}).sort((a, b) => (a.date < b.date ? 1 : -1)) // newest first

for (const post of posts) {
	const dir = path.join(BLOG_DIR, post.slug)
	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(path.join(dir, 'index.html'), postPage(post))
	console.log(`✅  blog/${post.slug}/index.html`)
}
fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexPage(posts))
console.log('✅  blog/index.html')
updateHomePage(posts)
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap(posts))
console.log('✅  sitemap.xml')
console.log(`\n${posts.length} post(s) built.`)
