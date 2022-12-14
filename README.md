# Video Debate Dapplet

The application is entirely written in `videbate.js`, but it requires a full front-end to run on, so we have a helper script that fetches the `CreatorApp` repo, prepares the `bbs-sdk.amd.js` files, hijacks the staking dapplet and runs a local front-end. Alas, this means you must have access to the `CreatorApp` repository.

This is strictly a developer deployment, and should not be used on unsafe networks.

```sh
./run.sh
```

The npm script that runs the front-end opens a browser window long before the front-end is actually ready, and it's recommended you close it to avoid confusion. After the front-end is fully loaded just open the following address in a browser:
http://localhost:3000/DEBATE/bbs_staking

The code for the dapplet is in `videbate.js` with some inline explanations.
