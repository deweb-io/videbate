import Fastify from 'fastify'
import routes from './routes.js';

const HOST = process.env.FASTIFY_ADDRESS || '127.0.0.1';
const PORT = process.env.FASTIFY_PORT || 8000;
const FASTIFY = Fastify({logger: true });

FASTIFY.register(routes);

FASTIFY.listen({host: HOST, port: PORT}, function (err, address) {
    if(err) {
        FASTIFY.log.error(err)
        process.exit(1)
    }
    console.info(`server listening on ${HOST}:${PORT}`);
});
