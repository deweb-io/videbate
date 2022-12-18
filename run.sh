#!/bin/bash -eu

create_sdk_files() {
    pushd ./SDK/
    npm i

    # Create an AMD package of the SDK, untill it becomes the standard.
    node -e "
        const fs = require('fs');
        const configFile = './config/webpack/webpack.common.ts';
        fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf8').replace(
            /output:[^}]*}/,
            'output: {libraryTarget: \'amd\', filename: \'bbs-sdk.amd.js\'}'
        ));"
    npm run build
    cp ./dist/bbs-sdk.* ../../.

    # Compile the SDK for standard use.
    git reset --hard
    npm run build
    popd

    # Create loadable script with operator configurations brought from the `CreatorApp` repository.
    {
        echo -n 'const BBS_OPERATOR_CONFIGURATION = '
        sed -e 's/\("domainName"\)[^,]*\(,\?\)/\1: "creator-eco-stage.web.app"\2/' \
            ./Frontend/backup/operator-config/operator.config.creator-stage.json
        echo ';'
    } > ../bbs-sdk.config.js

}

create_frontend() {
    pushd ./Frontend/

    # Add the SDK to systemjs mapping.
    sed -ie 's|"imports": {|"imports": {"@deweb/bbs-sdk": "http://localhost:8000/bbs-sdk.amd.js",|' \
        ./src/index.html

    # Hijack the Staking dapplet.
    sed -ie 's|"@deweb/bbs_staking":.*|"@deweb/bbs_staking": "http://localhost:8000/videbate.js",|' \
        ./backup/operator-config/dapplet.config.creator-stage.json
    sed -ie 's|icon="cup"|icon="video"|;s|https://bbs.market/METABBS|/DEBATE|' \
        ./src/components/Header/Header.tsx

    npm i
    popd
}

# Get the CreatorApp repo if needed.
[ -d CreatorApp ] || git clone --depth=1 -b master git@github.com:deweb-io/CreatorApp
pushd CreatorApp

# Create the SDK files if needed.
[ "$(ls ../bbs-sdk.* 2>/dev/null | wc -l)" = 3 ] || create_sdk_files

# Build modified frontend if it wasn't modified already.
[ "$(git diff)" ] || create_frontend

# Termporarily disabled.
# Run the modified frontend in the background.
#(cd ./Frontend/ && npm run dev:creator-stage) &

popd

# Run a local CORS Web server with no cache to serve the local files.
python3 -c'
from http.server import HTTPServer, SimpleHTTPRequestHandler
class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        if self.path.endswith("bbs-common.js"):
            self.send_header("Content-Type", "application/javascript")
        SimpleHTTPRequestHandler.end_headers(self)
HTTPServer(("", 8000), CORSRequestHandler).serve_forever()'

# Bring the frontend server to the foreground once the python server is done.
fg

exit 0
