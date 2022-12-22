import * as fs from 'fs';

import * as db from './db.js';

const indexHtml = fs.readFileSync('./index.html', 'utf8');

export default async(fastify, _) => {
    fastify.get('/', async(_, reply) => reply.header('Content-Type', 'text/html').send(indexHtml));
    fastify.get('/health', async(_, reply) => await db.health());
};
