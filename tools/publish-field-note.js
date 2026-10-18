// Run only by .github/workflows/publish-field-note.yml. Reads the issue from
// the event file at GITHUB_EVENT_PATH, validates it, and writes
// blog/posts/<slug>.md. Issue text never touches a shell.
'use strict';
const fs = require('fs');
const path = require('path');

function fail(message) {
  if (process.env.PUBLISH_ERROR_FILE) fs.writeFileSync(process.env.PUBLISH_ERROR_FILE, message);
  console.error(message);
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = event.issue;
const body = (issue.body || '').replace(/\r\n/g, '\n');
const title = (issue.title || '').trim();

const lines = body.split('\n');
const noteAt = lines.findIndex((l) => l === '### Field note');
if (noteAt === -1) {
  fail('The issue is missing its "Field note" section. Open it with the Field note template.');
}
const clean = (s) => (s === '_No response_' ? '' : s);
const note = clean(lines.slice(noteAt + 1).join('\n').trim());

function section(heading) {
  const head = lines.slice(0, noteAt);
  const start = head.findIndex((l) => l === heading);
  if (start === -1) return '';
  let end = head.findIndex((l, i) => i > start && l.startsWith('### '));
  if (end === -1) end = head.length;
  return clean(head.slice(start + 1, end).join(' ').replace(/\s+/g, ' ').trim());
}
const description = section('### Description');
let date = section('### Publish date');

if (!title) fail('The issue has no title. The title becomes the post title.');
if (!description) fail('The description is empty. Add one sentence and add the publish label again.');
if (!note) fail('The field note is empty.');
if (!date) {
  date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
} else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + 'T00:00:00Z')) ||
  new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) {
  fail(`The publish date "${date}" is not a real date in YYYY-MM-DD form.`);
}

let slug = title
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
if (slug.length > 60) {
  slug = slug.slice(0, 60);
  slug = slug.slice(0, slug.lastIndexOf('-') === -1 ? 60 : slug.lastIndexOf('-')).replace(/^-+|-+$/g, '');
}
if (!slug) fail('The title has no letters or numbers to make a web address from.');

const file = path.join(__dirname, '..', 'blog', 'posts', slug + '.md');
if (fs.existsSync(file)) {
  fail(`A field note at hartops.com/blog/${slug}/ already exists. Change the issue title and add the publish label again.`);
}

const md = `---\ntitle: ${title}\ndate: ${date}\ndescription: ${description}\n---\n\n${note}\n`;
fs.writeFileSync(file, md);

if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'slug=' + slug + '\n');
console.log('Wrote blog/posts/' + slug + '.md');
