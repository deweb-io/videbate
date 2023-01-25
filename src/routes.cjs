const fs = require('fs');

const multer = require('fastify-multer');

const db = require('./db.cjs');
const storage = require('./storage.cjs');

const uploadPreHandler = multer({storage: multer.memoryStorage()});

const showTemplate = fs.readFileSync('./site/show.html.template', 'utf8');

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

module.exports = async(fastify, _) => {
    // Configure swagger if needed.
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(require('@fastify/swagger'), {swagger: {info: {
            title: 'Videbate', description: fs.readFileSync('./README.md', 'utf8'), version: '0.1.0'
        }}});
        await fastify.register(require('@fastify/swagger-ui'), {routePrefix: '/doc'});
    }

    // Configure multipart/form-data parser
    await fastify.register(multer.contentParser);

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

    // A route for static serving files from the `site` directory.
    fastify.get('/site/:fileName', async(request, response) => {
        const path = `/site/${request.params.fileName}`;
        try {
            const content = fs.readFileSync(`.${path}`, 'utf8');
            if(path.endsWith('.js')) {
                return response.type('application/javascript').send(content);
            } else if(path.endsWith('.html')) {
                return response.type('text/html').send(content);
            }
        } catch(_) {
            // Ignore.
        }
        return response.code(404).type('text/plain').send('file not found');
    });

    // Upload a video
    fastify.post('/upload', {preHandler: uploadPreHandler.single('video')}, async(request, response) => {
        const file = request.file;
        if(!file) {
            return response.status(400).type('text/plain').send('no file provided');
        }

        // Upload the file to GCS.
        try {
            response.status(201).send(await storage.uploadHandler(file));
        } catch(error) {
            console.error(error);
            return response.status(500).send(error);
        }
    });

    fastify.post('/userEvent', {
        schema: {body: {type: 'object', properties: {
            event: {type: 'string'}, data: {type: 'object'},
            postId: {type: 'array', items: {type: 'string'}}, userId: {type: 'string'}}}}
    }, async(request, response) => {
        await db.addUserEvent(request.body.userId, request.body.postId, request.body.event, request.body.data);
        return response.status(201).type('text/plain').send('created');
    });
};
