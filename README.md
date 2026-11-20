# Telegram Rich Text by steffko

The single-page project home and HTML to Rich converter for an independent, free ChatGPT plugin. The page includes the converter and the publisher’s support and privacy sections. It makes no claim about Directory publication.

A drafted rich message has one ordinary HTML code block and an external HTML to Rich link. If the host has a compatible rendered preview, copy its formatted content into Telegram’s rich-text editor. If the preview is unavailable or the pasted formatting is lost, use the converter on this site.

## Use

1. Open https://html-to-rich.github.io/ in a browser.
2. Choose **Paste HTML**, or expand **Paste manually or edit HTML** and paste an HTML fragment with complete tags.
3. Check the formatted preview and link destinations.
4. Choose **Copy Rich Text** and paste into your destination application. Inspect the result before sending or saving it.

The clipboard contains both `text/html` and `text/plain`. If the main rich clipboard API is unavailable, the converter tries its existing copy-event fallback. **Select preview** provides a separate manual copying route. Clipboard access depends on HTTPS, browser permissions and a user action.

## Supported HTML profile

Use complete, explicitly closed and correctly nested HTML fragments, not full HTML documents. Matching outer HTML code fences are accepted. The checker rejects malformed markup, stray text outside elements and HTML parser repairs that would move or discard authored content. The browser can insert an implicit table body around complete rows. Meaningful `<br>` line breaks and standalone `<code>` fragments are accepted; use `<pre><code>` for preformatted code. Escape literal `&`, `<` and `>` inside code, rather than placing executable HTML there.

Allowed elements: `h1`–`h6`, `p`, `div`, `span`, `br`, `strong`, `b`, `em`, `i`, `u`, `mark`, `s`, `del`, `sup`, `sub`, `ul`, `ol`, `li`, `blockquote`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `details`, `summary`, `pre`, `code`, `a` and `hr`.

The sanitizer retains only these input attributes:

- On allowed elements: `dir="ltr"`, `dir="rtl"` or `dir="auto"`; `lang` with a conservative ASCII language-tag shape (two to eight primary letters followed by optional one-to-eight-character alphanumeric subtags, or `x-`/`i-` forms with such subtags). This checks shape, not language-registry membership.
- On `ol`: a signed safe-integer `start` value (including zero and negative values). `li value`, reversed lists and alternative numbering styles are not implemented.
- On `details`: boolean `open`.
- On `th` and `td`: `colspan`/`rowspan` from 1 to 6 and `align="left|center|right"`.
- On `a`: a validated `href`, as described below. Safe links receive `rel="noopener noreferrer"` and `target="_blank"`.

The checker rejects scripts, event handlers, CSS/style attributes, forms, images, embedded media and other unsupported elements or attributes. It reports a diagnostic and leaves the original source in the editor so you can decide how to represent the content. Arbitrary website layout is not reproduced. Table-cell alignment is distinct from paragraph alignment: paragraph `align` and CSS alignment/justification are not implemented. Language and writing direction are retained in the rich HTML payload; that does not prove a recipient application will preserve their behavior.

### Links

Supported destinations are absolute HTTP(S) URLs and two deliberately limited, user-activated contact schemes:

- `mailto:`: one unquoted ASCII address, with optional unique `subject` and `body` query fields only. Multiple recipients, extra headers, fragments and raw or encoded control characters are rejected. Encoded multiline bodies are therefore outside this profile.
- `tel:`: a global number beginning with `+`, digits and visual separators `-`, `.` or parentheses, optionally followed by one `;ext=` numeric extension. Local numbers, other parameters, query strings and fragments are outside this profile.

Raw or percent-decoded ASCII control characters and malformed percent escapes are rejected in all destinations. Relative URLs and other schemes, including `javascript:`, `data:`, `ftp:` and `tg:`, produce an `UNSAFE_URL` diagnostic. The author can supply a supported destination or explicitly choose a label without a link. HTTP(S) queries and fragments are preserved semantically, with normal HTML attribute escaping. Following a safe link can open a destination or device handler only after the user's action; the converter does not send mail, dial or navigate automatically.

### Rich HTML and plain text

The rich clipboard representation contains the sanitized semantic HTML. The plain representation uses decimal ordered-list numbers (honoring `start`), bullets and two-space nested-list indentation, line breaks for `<br>`, readable table-row separators and a link's destination after its label unless the label is already that full URL.

Within `pre` and `code`, explicit `br` produces a newline. Inline emphasis is allowed. Structural elements or active links inside literal code require a decision from the author. Contents of `pre` and `code` are protected from prose whitespace normalization, preserving indentation and blank lines after ordinary HTML entity decoding and parser line-ending normalization. When the source contains CR or CRLF line endings, the checker reports `LINE_ENDINGS_NORMALIZED` and returns LF line endings. Formatting whitespace between HTML elements is not a visible spacing contract. Complex table layout, collapse interaction, direction/language properties and typography cannot be represented as plain-text properties.

A successful clipboard write does not prove that the destination preserves every feature. Formatting support varies between applications. Check the pasted result in the receiving editor, including interactive elements such as disclosures.

## Shared processing contract

The browser and the plugin’s `prepare_rich_text` tool use the same generated ES module. Import `prepareRichText` from `converter-core.mjs` and pass one HTML string. A successful result includes `ok`, the prepared `html`, its `plainText`, a list of `diagnostics` with `code` and `message`, the `profileVersion` and `sanitizationChanged`. The last field compares the accepted serialization with the exact input, including fence removal, link attributes and canonical HTML escaping. Backtick runs are entity-encoded in HTML and survive literally in the text. Rejections return empty HTML/text, a diagnostic and `sanitizationChanged: false`; the submitted draft stays with the caller.

The processing limits are 65,536 UTF-8 bytes for input and accepted HTML and 64 levels of authored nesting. Both the online and offline converter apply this profile. These bounds apply to the converter. It cannot verify facts, destination availability, clipboard permission or formatting in another application.

## Privacy

The ChatGPT tool sends the submitted fragment to steffko’s validation service for in-memory processing. See the [on-page policy](https://html-to-rich.github.io/#privacy) for service and infrastructure logging details. The website converter independently processes pasted HTML in the browser, including when the validation service is unavailable. It has no analytics, account system or content-upload request. A content security policy restricts resources and connections. Following a link in the preview opens that destination, which has its own privacy behavior.

GitHub serves the website and can receive ordinary hosting request information, such as IP addresses and requests for app files. Local message processing is separate from those hosting requests. The service worker caches app files, not message content. The source field is not deliberately saved by the application. Public support and privacy/deletion requests go to steffko at telegram.rich.text@gmail.com via Gmail. The on-page privacy section summarizes processing and contact details.

## Files and maintenance

The origin serves `index.html`, `app.css`, `app.js`, `converter-core.mjs`, `icon.png`, `manifest.webmanifest`, `sw.js` and the `.nojekyll` static-serving marker. The PNG matches the original v2.7.0 plugin icon. The earlier `icon.svg` URL remains available to older clients. GitHub Pages serves `main` at the repository root. End users need only the static files.

To update the processor, edit `src/converter.mjs`, run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run build` and `pnpm test`. Commit the regenerated bundle. The lockfile pins the [parse5 HTML parser](https://github.com/inikulin/parse5/releases/tag/v8.1.1), its entities dependency and [esbuild](https://github.com/evanw/esbuild/releases/tag/v0.28.2). The bundle carries the distribution notices. The pure parser builds an in-memory tree without executing input or downloading resources. The offline browser and the server consume identical bytes. Rebuild and deploy both consumers when adopting a new core revision.

All app paths target the origin root. When changing cached assets, update the cache version in `sw.js`. The worker tries the network first and falls back to cached app resources; installed copies can continue showing cached files when offline.

Review changes before committing and verify the actual deployed files and clipboard output. The homepage identifies the project independently of Telegram. No license has been selected.

