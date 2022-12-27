import fastify from 'fastify';

import routes from './routes.js';

const HOST = process.env.FASTIFY_ADDRESS || '127.0.0.1';
const PORT = process.env.FASTIFY_PORT || 8000;
const FASTIFY = fastify({logger: true});

if(process.env.VIDEBATE_DEBUG) {
    FASTIFY.register(await import('@fastify/swagger'));
    FASTIFY.register(await import('@fastify/swagger-ui'));
}

FASTIFY.register(routes);
await FASTIFY.ready();

FASTIFY.listen({host: HOST, port: PORT}, function(error, address) {
    if(error) {
        FASTIFY.log.error(error);
        process.exit(1);
    }
    console.info(`server listening on ${HOST}:${PORT}`);
});
