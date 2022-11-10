# Video Debate Dapplet

The application is entirely written in `vidibate.js`, but it requires a full front-end to run on, so we have a helper script that fetches the `CreatorApp` repo, prepares the `bbs-sdk.amd.js` files, hijacks the staking dapplet and runs a local front-end. Alas, this means you must have access to the `CreatorApp` repository.

This is strictly a developer deployment, and should not be used on unsafe networks.

```sh
./run.sh
```

http://localhost:3000/DEBATE/bbs_staking
