# Video Debate Plugin

This is a plugin to the BBS core-UI, exploring a new way to navigate between video posts.

* A video debate starts with a challenge, which is a video post that challenges other users to respond to it.
* Challenges can be responded to with another video post, debating with the first.
* Responses can also be responded to, thus creating a threaded video debate.

The plugin has two points of interface with the BBS core-UI:

* When publishing a new video post, the user can mark is a videbate challenge
* When viewing a video debate post, the videbate UI is loaded into the post page, governing not only the look and feel of the post, but also the progression of the user between posts.

## Operation

We run a small fastify server that answers embed calls when creating new posts, and serves the viewer (written in HTML, CSS and JS, using the bbs-common library) when viewing them. In the future, it will also serve the viewer as a Single SPA package, for more "native" integration with the BBS Web core-UI. In the more further future it may serve plugins for the BBS mobile core-UI.

## Requirements

* Node 18
* Postgres 15

## Running Locally

Create an `.env` file with some basic params:

* `FASTIFY_ADDRESS` - Host to serve from (defaults to 127.0.0.1)
* `FASTIFY_PORT` - Port to serve from (defaults to 8000)
* `FASTIFY_WATCH` - Auto reload server when files change (defaults to false)
* `PGHOST` - Postgres host (defaults to localhost)
* `PGPORT` - Postgres port (defualts to 5432)
* `PGDATABASE` - Postgres database (schema) name (defaults to postgres)
* `PGUSERNAME` - Postgres user name (defaults to user running the process)
* `PGPASSWORD` - Postgres user password (defaults to no-password)

```sh
npm install          # Install dependencies
npm refreshDatabase  # Initialize the database (drops and recreates the table)
npm test             # Run tests
npm coverage         # Run tests and check coverage
npm dev              # Run the Web server in debug mode
npm run start        # Run the Web server in production mode
```
