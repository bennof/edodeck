# Vendored KaTeX

KaTeX v0.18.4 (https://katex.org), copied from the official release so the
demo pages work without a network connection or an npm install. edodeck
itself does not include KaTeX — the page provides it.

Files here:

- `katex.min.css` + `fonts/` (relative paths in the CSS, keep them together)
- `katex.min.js`
- `LICENSE` — MIT, required alongside the code per its terms

edodeck only needs `window.katex` (from `katex.min.js`); the auto-render
extension is not used.

To update: `npm pack katex@<version>`, unpack it, and copy
`package/dist/{katex.min.css,katex.min.js,fonts}` and `package/LICENSE` into
this folder.
