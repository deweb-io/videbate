import fs from 'fs';

import {init, getPosts} from './db.js';


const indexHtml = fs.readFileSync('./index.html', 'utf8');

export default async(fastify, _) => {
    await init();
    fastify.get('/', async(_, reply) => (reply.header('Content-Type', 'text/html').send(indexHtml)));
    fastify.get('/db', async(_, reply) => await getPosts());
};
