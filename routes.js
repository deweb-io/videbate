import fs from 'fs';
const indexHtml = fs.readFileSync('./index.html', 'utf8');

export default (fastify, _, done) => {
    fastify.get('/', async(_, reply) => (reply.header('Content-Type', 'text/html').send(indexHtml)));
    done();
};
