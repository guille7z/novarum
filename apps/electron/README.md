# Novarum desktop

Electron shell for the frontend. Run all development services from the repository root:

```sh
bun run dev
```

Create desktop installers with `bun run --filter desktop build`.

## Development updates

Packaged clients check the GitHub `dev` channel shortly after launch and every 30 minutes.
The desktop release workflow publishes a SemVer prerelease for update ordering and a matching
`SHORTSHA-desktop` Git tag for commit lookup.

Automatic updates on macOS require these GitHub Actions secrets:

- `MAC_CSC_LINK`
- `MAC_CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
