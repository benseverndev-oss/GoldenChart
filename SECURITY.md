# Security Policy

## Supported versions

GoldenChart is pre-1.0; security fixes land on the latest published release of
`goldenchart` and `goldenchart-mcp`.

## Reporting a vulnerability

Please report security issues privately via GitHub's
[private vulnerability reporting](https://github.com/benseverndev-oss/GoldenChart/security/advisories/new)
rather than opening a public issue. Include a description, affected version, and
a minimal reproduction if possible.

You can expect an initial acknowledgement within a few days. Once a fix is ready
we'll coordinate disclosure and credit you if you'd like.

## Scope notes

GoldenChart turns data into SVG. The library does not execute untrusted code, but
text you pass (labels, titles, descriptions) is rendered into SVG markup — if you
inject GoldenChart output into an HTML document, sanitize untrusted input as you
would for any user-supplied content.
