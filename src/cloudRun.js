import Fastify from 'fastify';

import routes from './routes.js';

/**
 * start server on google cloud run
 */
async function start() {
    // Google Cloud Run will set this environment variable for you, so
    // you can also use it to detect if you are running in Cloud Run
    const IS_GOOGLE_CLOUD_RUN = process.env.K_SERVICE !== undefined;

    // You must listen on the port Cloud Run provides
    const port = process.env.PORT || 3000;

    // You must listen on all IPV4 addresses in Cloud Run
    const host = IS_GOOGLE_CLOUD_RUN ? '0.0.0.0' : 'localhost';

    try {
        const fastify = new Fastify({logger: {level: process.env.FASTIFY_LOG_LEVEL}, trustProxy: true});
        await routes(fastify);
        const address = await fastify.listen({port, host});
        console.log(`Listening on ${address}`);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

start();
