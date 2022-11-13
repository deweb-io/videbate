#!/bin/bash -eu

create_sdks() {
    pushd ./CreatorApp/SDK/
    npm i

    # Create an AMD package of the SDK, untill it becomes the standard.
    sed -ie "/output: {/,/},/c\output: {libraryTarget: 'amd', filename: 'bbs-sdk.amd.js'}," \
        ./config/webpack/webpack.common.ts
    npm run build
    cp ./dist/bbs-sdk.* ../../.
    git reset --hard

    # Compile the SDK for standard use.
    npm run build
    popd
}

create_frontend() {
    git clone --depth=1 -b master git@github.com:deweb-io/CreatorApp
    create_sdks
    pushd ./CreatorApp/Frontend/

    # Create loadable script with operator configurations brought from the `CreatorApp` repository.
    {
        echo -n 'const BBS_OPERATOR_CONFIGURATION = '
        sed -e 's/\("domainName"\)[^,]*\(,\?\)/\1: "creator-eco-stage.web.app"\2/' \
            ./backup/operator-config/operator.config.creator-stage.json
        echo ';'
    } > ../../bbs-sdk.config.js


    # Add the SDK to systemjs mapping.
    sed -ie 's|"imports": {|"imports": {"@deweb/bbs-sdk": "http://localhost:8000/bbs-sdk.amd.js",|' \
        ./src/index.html

    # Hijack the Staking dapplet.
    sed -ie 's|"@deweb/bbs_staking":.*|"@deweb/bbs_staking": "http://localhost:8000/vidibate.js",|' \
        ./backup/operator-config/dapplet.config.creator-stage.json
    sed -ie 's|icon="cup"|icon="video"|;s|https://bbs.market/METABBS|/DEBATE|' \
        ./src/components/Header/Header.tsx

    npm i
    popd
}

run_frontend_in_background() {
    [ -d CreatorApp ] || create_frontend
    (cd ./CreatorApp/Frontend/ && npm run dev:creator-stage) &
}

run_backend() {
    python3 -c'
from http.server import HTTPServer, SimpleHTTPRequestHandler
class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        SimpleHTTPRequestHandler.end_headers(self)
HTTPServer(("", 8000), CORSRequestHandler).serve_forever()'
}

run_frontend_in_background
run_backend
fg
exit 0
