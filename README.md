# HTML to Rich

A small, static converter for previewing supported semantic HTML and copying browser rich text.

**Pre-release. Android-to-Telegram acceptance on this origin is pending.** Formatting support varies between browsers, operating systems and destination applications.

## Use

1. Open https://html-to-rich.github.io/ in a browser.
2. Choose **Paste HTML**, or expand **Paste manually or edit HTML** and paste an HTML fragment with complete tags.
3. Check the formatted preview and link destinations.
4. Choose **Copy Rich Text** and paste into your destination application. Inspect the result before sending or saving it.

The clipboard contains both `text/html` and `text/plain`. If the main rich clipboard API is unavailable, the converter tries its existing copy-event fallback. **Select preview** provides a separate manual copying route. Clipboard access depends on HTTPS, browser permissions and a user action.

## Supported content and limits

Supported semantic elements include headings, paragraphs, emphasis, links, lists, blockquotes, tables, code and collapsible sections. Scripts, event attributes, images, forms and embedded media are removed. Only absolute HTTP and HTTPS link destinations are retained. Unsupported wrappers are removed while their text can remain.

Input must be a complete, explicitly closed HTML fragment, rather than a full HTML document. Matching HTML code fences are accepted. Incomplete markup and stray text outside HTML elements are rejected. HTML error recovery, CSS styling and arbitrary website layout are not supported.

Collapsible sections, table layout, list numbering and other formatting may change or disappear when pasted into another application. A successful clipboard write does not prove that the destination preserved every feature. Actual Android-to-Telegram verification remains pending for this pre-release.

## Privacy

HTML is parsed and processed locally in browser memory. The application has no backend, analytics, account system or content-upload request. A content security policy restricts resources and connections. Following a link in the preview opens that destination, which has its own privacy behavior.

GitHub serves the website and can receive ordinary hosting request information, such as IP addresses and requests for app files. Local message processing is separate from those hosting requests. The service worker caches app files, not message content. The source field is not deliberately saved by the application.

## Files and maintenance

The website consists of `index.html`, `app.css`, `app.js`, `icon.svg`, `manifest.webmanifest`, `sw.js` and the `.nojekyll` static-serving marker. There is no build step or package dependency. GitHub Pages serves `main` at the repository root.

All app paths target the origin root. When changing cached assets, update the cache version in `sw.js`. The worker tries the network first and falls back to cached app resources; installed copies can continue showing cached files when offline.

Review changes before committing and verify the actual deployed files and clipboard output. Keep the pre-release label until Android acceptance is completed. No license has been selected.
