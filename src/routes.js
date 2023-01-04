import * as fs from 'fs';

import * as db from './db.js';

const showTemplate = fs.readFileSync('./showTemplate.html', 'utf8');

const showPostHandler = async(request, response, postId) => {
    try {
        return response.type('text/html').send(showTemplate.replace(
            'const postData = null;',
            `const postData = ${JSON.stringify(await db.getPostData(postId))};`
        ));
    } catch(error) {
        return response.code(404).type('text/plain').send('post not found');
    }
};

export default async(fastify, _) => {
    // Configure swagger if needed.
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(await import('@fastify/swagger'), {swagger: {info: {
            title: 'Videbate', description: fs.readFileSync('./README.md', 'utf8'), version: '0.1.0'
        }}});
        await fastify.register(await import('@fastify/swagger-ui'), {routePrefix: '/doc'});
    }

    // A health check - let's make it a bit more thorough.
    fastify.get('/health', async(_, reply) => await db.health());

    // Create a new post.
    fastify.post('/new', {
        schema: {body: {type: 'object', properties: {id: {type: 'array', items: {type: 'string'}}}}}
    }, async(request, response) => response.code(201).send(await db.addPost(request.body.id)));

    // View a post with a POST request.
    fastify.post('/show', {
        schema: {body: {type: 'object', properties: {id: {type: 'array', items: {type: 'string'}}}}}
    }, async(request, response) => showPostHandler(request, response, request.body.id));

    // View a post with a GET request.
    fastify.get('/show/:postId', {
        schema: {params: {type: 'object', properties: {postId: {type: 'array', items: {type: 'string'}}}}}
    }, async(request, response) => showPostHandler(request, response, request.params.postId));

    // A route for static serving javascript files from the `site` directory.
    fastify.get('/site/:fileName', async(request, response) => {
        const path = `/site/${request.params.fileName}`;
        try {
            const content = fs.readFileSync(`.${path}`, 'utf8');
            if(path.endsWith('.js')) {
                return response.type('application/javascript').send(content);
            }
        } catch(_) {
            // Ignore.
        }
        return response.code(404).type('text/plain').send('file not found');
    });
};
