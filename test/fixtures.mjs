export const examples = [
  ['literal code', '<pre><code>  erste\n\n&#96;&#96;&#96;\n  آخر\n</code></pre>', '  erste\n\n```\n  آخر\n'],
  ['nested numbering', '<ol start="7"><li>One<ul><li>Nested</li></ul></li><li>Two</li></ol>', '7. One\n  • Nested\n8. Two'],
  ['table', '<table><tr><th>A</th><th>B</th></tr><tr><td align="right">1</td><td>2</td></tr></table>', 'A | B\n1 | 2'],
  ['link', '<p><a href="https://example.org/?a=1&amp;b=2">Details</a></p>', 'Details (https://example.org/?a=1&b=2)'],
  ['disclosure and mixed direction', '<details open><summary>Résumé</summary><p dir="rtl" lang="ar">أهلا ABC e\u0301</p></details>', 'Résumé\n\nأهلا ABC e\u0301'],
  ['formatting', '<h2>Title</h2><blockquote><p><strong>first</strong><br><em>second</em></p></blockquote>', 'Title\n\nfirst\nsecond']
];
