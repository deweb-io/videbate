import fastifyServer from 'fastify';

import routes from '../src/routes.js';

// We always use these values for Cloud Run - ignoring the environment variables.
const HOST = '0.0.0.0';
const PORT = 3000;

(async function() {
    try {
        const fastify = fastifyServer({trustProxy: true, logger: true});
        fastify.register(routes);
        await fastify.ready();
        const address = await fastify.listen({host: HOST, port: PORT});
        console.log(`Listening on ${address}`);
    } catch(error) {
        console.error(error);
        process.exit(1);
    }
})();
