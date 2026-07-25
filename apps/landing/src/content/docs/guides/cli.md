# CLI usage instructions

The CLI is a useful tool to interact with Anchor and perform various tasks.

The usual way to run the CLI is inside the docker container and executing the Anchor binary:  
```bash
docker exec -it anchor ./anchor cli <command> [options]
```

## Promoting and demoting as homeserver admin

- To promote: `promote-admin <username>`
- To demote: `demote-admin <username>`

This will allow access to the admin panel for the given user. Use carefully!