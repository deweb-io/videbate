# Video Debate Plugin

This is a plugin to the BBS core-UI, exploring a new way to render video posts and navigate between them.

* A video debate starts with a challenge, which is a video post that challenges other users to respond to it.
* Challenges can be responded to with another video post, debating with the first.
* Responses can also be responded to, thus creating a threaded video debate.

The plugin has two points of interface with the BBS core-UI:

* When publishing/editing a new video post, the user can mark is a videbate challenge
* When viewing a video debate post, the videbate UI is loaded into the post page, replacing the video block and governing not only the look and feel of the post, but also the progression of the user between posts.

## Operation

We run a small fastify server with the following endpoints:
* `GET:/health` - checks if everythin is fine and dandy, for monitoring
* `POST:/new` - creates a new post in the vidibate database with a given ID, returning some meta-data to be embedded in the post.
* `POST:/show` - returns HTML UI for viewing the post with the given ID.
* `GET:/show/:postId` - same as above, mostly for testing.
* `GET:/site/:file` - serve static files from the `site` directory, setting MIME type according to extension.

In the future, it will also serve the viewer as a Single SPA package, for more "native" integration with the BBS Web core-UI. In the more further future it may serve plugins for the BBS mobile core-UI.

## BBS Network Integration

We use the [bbs-common library](https://github.com/deweb-io/bbs-common/), available on npm. By default, we use the latest version from [jsdelivr](https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@1.0.7/index.min.js). For convenience, you can keep your own version on `site/bbs-common.js` and it will be used instead.

## Requirements

* Node 18
* Postgres 15

## Running Locally

Create an `.env` file with some basic params:

* `FASTIFY_ADDRESS`  - Host to serve from (defaults to 127.0.0.1)
* `FASTIFY_PORT`     - Port to serve from (defaults to 8000)
* `FASTIFY_SWAGGER`  - Serve swagger-UI from `/doc` (defaults to false)
* `GCP_PROJECT_ID`   - GCP project name for video file storage (no default - required)
* `GCP_BUCKET_NAME`  - GCP bucket name for video file storage (no default - required)
* `GOOGLE_APPLICATION_CREDENTIALS` - Service account json for access Google Cloud Storage
* `PGHOST`           - Postgres host (defaults to localhost)
* `PGPORT`           - Postgres port (defualts to 5432)
* `PGDATABASE`       - Postgres database (schema) name (defaults to postgres)
* `PGUSERNAME`       - Postgres user name (defaults to user running the process)
* `PGPASSWORD`       - Postgres user password (defaults to no-password)

```sh
npm install         # Install dependencies
npm run refresh-db  # Initialize the database (drops and recreates the table)
npm run lint        # Run the linter
npm run test        # Run tests
npm run coverage    # Run tests and check coverage
npm run serve       # Run the Web server
npm run start       # Run the Web server in production mode (with all checks)
npm run dev         # Run the Web server in debug mode (auto reload and swagger enabled)
```

## Deploy to GCP

Create an env.yaml file in deployment directory with the following params (documented on running localy section):

* `FASTIFY_LOG_LEVEL` - Fastify log level
* `GCP_PROJECT_ID`
* `GCP_BUCKET_NAME`
* `PGHOST`
* `PGPORT`
* `PGDATABASE` 

Set the following secerts in Secrets Manager:

* `PGUSERNAME`
* `PGPASSWORD`
* `GOOGLE_APPLICATION_CREDENTIALS`

Set deploy env in `deployment/cloudRunDeploy.sh` and run it.

After deployment, set the secrets as environment variables.

## Using Cloud SQL (postgres)
First, create instance on google cloud.

In order to allow connection from cloud run follow the following:
https://towardsdatascience.com/how-to-connect-to-gcp-cloud-sql-instances-in-cloud-run-servies-1e60a908e8f2

In order to connect to postgres from local during development:
    1. add your ip to Authorized networks
    2. set `PGHOST` to equal the public ip of the postgress instance on GCP (and update other postgres related env if needed).
