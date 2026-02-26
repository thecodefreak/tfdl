# Security Policy

## Supported Versions

Security fixes are best-effort and currently focused on:

- `main` (latest commit)
- Most recent tagged release

Older releases may not receive fixes.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities.

Preferred reporting path:

1. Use GitHub private vulnerability reporting / security advisories for this repo.
2. If private reporting is not available, contact the maintainer privately via
   GitHub and share details there.

Include:

- affected version/commit
- reproduction steps
- impact assessment
- proof of concept (if safe to share)
- any suggested mitigation

The project aims to acknowledge reports within 7 days and provide a status
update when triage is complete.

## Scope Notes

TFDL is primarily a local-first tool workspace. The included Go server supports:

- static file serving
- alias routing (`/t/<alias>/`)
- optional Basic Auth

If you expose TFDL beyond localhost:

- run it behind TLS (Basic Auth credentials are otherwise sent without transport encryption)
- use strong credentials
- do not commit secrets in `tfdl.json` (use local files / environment variables)

The server blocks direct `.git` path access when serving the project root, but
that should not be treated as a substitute for broader deployment hardening.
