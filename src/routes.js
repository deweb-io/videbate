import * as fs from 'fs';

// import * as bbs from '@dewebio/bbs-common';
import * as bbs from './bbs-common.debug.js';

import * as db from './db.js';

await bbs.initialize('creator-eco-stage');

const showPost = async(postId) => {
    await bbs.getPostById(postId);
};

const staticRoutes = {
    '/show': ['text/html', fs.readFileSync('./index.html', 'utf8')],
    '/videbate.js': ['text/javascript', fs.readFileSync('./videbate.js', 'utf8')]
};
const serveStatic = (request, reply) => {
    if(request.url in staticRoutes) {
        return reply.header('Content-Type', staticRoutes[request.url][0]).send(staticRoutes[request.url][1]);
    }
    return reply.code(404).send('Not Found');
};

export default async(fastify, _) => {
    fastify.get('/health', async(_, reply) => await db.health());
    fastify.post('/new', async(request, reply) => reply.code(201).send(await db.addPost(request.body.id)));
    fastify.post('/show', async(request, reply) => {
        try {
            await showPost(request.body.id.at(-1));
        } catch(error) {
            return reply.code(404).send('Post not Found');
        }
        return serveStatic(request, reply);
    });
    fastify.get('*', async(request, reply) => serveStatic(request, reply));
};
