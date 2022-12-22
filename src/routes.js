import * as fs from 'fs';

import * as db from './db.js';

const indexHtml = fs.readFileSync('./index.html', 'utf8');

export default async(fastify, _) => {
    fastify.get('/health', async(_, reply) => await db.health());
    fastify.post('/new', async(request, reply) => reply.code(201).send(await db.addPost(request.body.id)));
    fastify.post('/show', async(request, reply) => reply.header('Content-Type', 'text/html').send(indexHtml));
};
