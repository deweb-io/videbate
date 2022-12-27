import * as fs from 'fs';

import * as db from './db.js';

const getPost = async(postId) => {
    return `const postData = ${JSON.stringify(await db.getPostData(postId))};`;
};

const showTemplate = fs.readFileSync('./showPostTemplate.html', 'utf8');
const videbateJs = fs.readFileSync('./videbate.js', 'utf8');

export default async(fastify, _) => {
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(await import('@fastify/swagger'));
        await fastify.register(await import('@fastify/swagger-ui'));
    }

    fastify.get('/health', async(_, reply) => await db.health());

    fastify.post('/new', {
        schema: {body: {type: 'object', properties: {id: {type: 'array', items: {type: 'string'}}}}}
    }, async(request, reply) => reply.code(201).send(await db.addPost(request.body.id)));

    fastify.post('/show', {
        schema: {body: {type: 'object', properties: {id: {type: 'array', items: {type: 'string'}}}}}
    }, async(request, reply) => {
        try {
            return reply
                .type('text/html')
                .send(showTemplate.replace('const postData = null;', await getPost(request.body.id)));
        } catch(error) {
            return reply.code(404).type('text/plain').send('post not found');
        }
    });

    // A route for static serving of the vidibate.js file
    fastify.get('/videbate.js', async(request, reply) => reply.type('text/javascript').send(videbateJs));
};
