# HTML to Rich

A small, static converter for previewing supported semantic HTML and copying browser rich text.

**Pre-release. Android-to-Telegram acceptance on this origin is pending.** Formatting support varies between browsers, operating systems and destination applications.

## Use

1. Open https://html-to-rich.github.io/ in a browser.
2. Choose **Paste HTML**, or expand **Paste manually or edit HTML** and paste an HTML fragment with complete tags.
3. Check the formatted preview and link destinations.
4. Choose **Copy Rich Text** and paste into your destination application. Inspect the result before sending or saving it.

The clipboard contains both `text/html` and `text/plain`. If the main rich clipboard API is unavailable, the converter tries its existing copy-event fallback. **Select preview** provides a separate manual copying route. Clipboard access depends on HTTPS, browser permissions and a user action.

## Supported HTML profile

Use complete, explicitly closed and correctly nested HTML fragments, not full HTML documents. Matching outer HTML code fences are accepted. Stray text outside elements and malformed tags are rejected before browser error recovery. Meaningful `<br>` line breaks and standalone `<code>` fragments are accepted; use `<pre><code>` for preformatted code. Escape literal `&`, `<` and `>` inside code, rather than placing executable HTML there.

Allowed elements: `h1`–`h6`, `p`, `div`, `span`, `br`, `strong`, `b`, `em`, `i`, `u`, `mark`, `s`, `del`, `sup`, `sub`, `ul`, `ol`, `li`, `blockquote`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `details`, `summary`, `pre`, `code`, `a` and `hr`.

The sanitizer retains only these input attributes:

- On allowed elements: `dir="ltr"`, `dir="rtl"` or `dir="auto"`; `lang` with a conservative ASCII language-tag shape (two to eight primary letters followed by optional one-to-eight-character alphanumeric subtags, or `x-`/`i-` forms with such subtags). This checks shape, not language-registry membership.
- On `ol`: a signed safe-integer `start` value (including zero and negative values). `li value`, reversed lists and alternative numbering styles are not implemented.
- On `details`: boolean `open`.
- On `th` and `td`: `colspan`/`rowspan` from 1 to 6 and `align="left|center|right"`.
- On `a`: a validated `href`, as described below. Safe links receive `rel="noopener noreferrer"` and `target="_blank"`.

Scripts, event handlers, CSS/style attributes, forms, images and embedded media are removed. Unsupported wrappers are removed while their text can remain. Arbitrary website layout is not reproduced. Table-cell alignment is distinct from paragraph alignment: paragraph `align` and CSS alignment/justification are not implemented. Language and writing direction are retained in the rich HTML payload; that does not prove a recipient application will preserve their behavior.

### Links

Supported destinations are absolute HTTP(S) URLs and two deliberately limited, user-activated contact schemes:

- `mailto:`: one unquoted ASCII address, with optional unique `subject` and `body` query fields only. Multiple recipients, extra headers, fragments and raw or encoded control characters are rejected. Encoded multiline bodies are therefore outside this profile.
- `tel:`: a global number beginning with `+`, digits and visual separators `-`, `.` or parentheses, optionally followed by one `;ext=` numeric extension. Local numbers, other parameters, query strings and fragments are outside this profile.

Raw or percent-decoded ASCII control characters and malformed percent escapes are rejected in all destinations. Relative URLs and other schemes, including `javascript:`, `data:`, `ftp:` and `tg:`, lose their `href`; their visible label can remain. HTTP(S) queries and fragments are preserved semantically, with normal HTML attribute escaping. Following a safe link can open a destination or device handler only after the user's action; the converter does not send mail, dial or navigate automatically.

### Rich HTML and plain text

The rich clipboard representation contains the sanitized semantic HTML. The plain representation uses decimal ordered-list numbers (honoring `start`), bullets and two-space nested-list indentation, line breaks for `<br>`, readable table-row separators and a link's destination after its label unless the label is already that full URL.

Contents of `pre` and `code` are protected from prose whitespace normalization, preserving indentation and blank lines after ordinary HTML entity decoding and parser line-ending normalization. Formatting whitespace between HTML elements is not a visible spacing contract. Complex table layout, collapse interaction, direction/language properties and typography cannot be represented as plain-text properties.

A successful clipboard write does not prove that the destination preserves every feature. Formatting support varies between applications. Actual Android-to-Telegram acceptance after these changes remains pending; earlier successful paths do not certify this revised release.

## Privacy

HTML is parsed and processed locally in browser memory. The application has no backend, analytics, account system or content-upload request. A content security policy restricts resources and connections. Following a link in the preview opens that destination, which has its own privacy behavior.

GitHub serves the website and can receive ordinary hosting request information, such as IP addresses and requests for app files. Local message processing is separate from those hosting requests. The service worker caches app files, not message content. The source field is not deliberately saved by the application.

## Files and maintenance

The website consists of `index.html`, `app.css`, `app.js`, `icon.svg`, `manifest.webmanifest`, `sw.js` and the `.nojekyll` static-serving marker. There is no build step or package dependency. GitHub Pages serves `main` at the repository root.

All app paths target the origin root. When changing cached assets, update the cache version in `sw.js`. The worker tries the network first and falls back to cached app resources; installed copies can continue showing cached files when offline.

Review changes before committing and verify the actual deployed files and clipboard output. Keep the pre-release label until Android acceptance is completed. No license has been selected.

