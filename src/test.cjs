const expect = require('chai').expect;

// A helper function to assert that a function throws an error with a given message.
const expectError = async(throwingFunction, message) => {
    let functionResult;
    try {
        functionResult = await throwingFunction();
    } catch(error) {
        functionResult = error;
    }
    expect(functionResult).to.be.an('Error');
    expect(functionResult.message).to.equal(message);
};

// describe('Storage tests', () => {
//     it('Upload a file', async() => {
//         const file = {
//             originalname: 'test.jpg',
//             mimetype: 'video/mp4',
//             buffer: new Buffer.from('test')
//         };
//
//         const sinon = await import('sinon');
//         const storage = await import('./storage.js');
//         const bucket = await import('@google-cloud/storage').then(({Storage}) => new Storage().bucket('test'));
//         const spy = sinon.stub(bucket, 'file').returns({
//             createWriteStream: () => ({
//                 end: () => {
//                     throw new Error('test error');
//                 }
//             })
//         });
//         console.log('!!!', storage.bucket);
//         sinon.stub(storage, 'bucket').returns(bucket);
//
//         const result = await storage.uploadHandler(file);
//         console.log('!!!', result);
//         expect(spy.calledWith(`videbate/${file.originalname}`)).to.be.true;
//         expect(result).to.equal(`file ${file.originalname} uploaded to google cloud storage`);
//     });
//
//    it('should reject the promise if there is an error', async() => {
//        const file = {
//            originalname: 'test.jpg',
//            mimetype: 'video/mp4',
//            buffer: new Buffer.from('test')
//        };
//
//        const spy = sinon.stub(bucket, 'file').returns({
//            createWriteStream: () => ({
//                end: () => {
//                    throw new Error('test error');
//                }
//            })
//        });
//
//        try {
//            await uploadHandler(file);
//        } catch (err) {
//            expect(err.message).to.equal('test error');
//        }
// });

describe('Database dependant tests', () => { // We should mock the database for any non-db tests.
    const db = require('./db.cjs');
    process.env.PGDATABASE = `${process.env.PGDATABASE}_test`;
    let now;

    beforeEach(async() => {
        now = new Date();
        const consoleWarn = console.warn;
        console.warn = () => {};
        await db.refreshDatabase();
        console.warn = consoleWarn;
    });

    describe('Testing database', () => {
        it('Post insert and retrieval', async() => {
            expect((await db.getChildren()).length).to.equal(0);
            expect((await db.getDecendants()).length).to.equal(0);

            await db.addPost(['a']);
            expect((await db.getChildren()).length).to.equal(1);
            expect((await db.getChildren(['a'])).length).to.equal(0);
            expect((await db.getDecendants()).length).to.equal(1);

            const post = (await db.getPost(['a']));
            expect(post.id).to.deep.equal(['a']);
            expect(post.verified).to.be.equal(null);
            expect(post.num_comments).to.equal(0);
            expect(now - post.created).to.be.lessThan(100);
            expect(now - post.updated).to.be.lessThan(100);

            await db.addPost(['b']);
            expect((await db.getChildren()).length).to.equal(2);
            expect((await db.getChildren(['a'])).length).to.equal(0);
            expect((await db.getChildren(['b'])).length).to.equal(0);

            await db.addPost(['a', 'b']);
            await db.addPost(['a', 'b', 'c']);
            expect((await db.getChildren()).length).to.equal(2);
            expect((await db.getChildren(['a'])).length).to.equal(1);
            expect((await db.getChildren(['a', 'b'])).length).to.equal(1);
            expect((await db.getChildren(['a', 'b', 'c'])).length).to.equal(0);

            await db.addPost(['a', 'b', 'd']);
            await db.addPost(['a', 'c']);
            await db.addPost(['a', 'd']);
            expect((await db.getChildren(['a'])).length).to.equal(3);
            expect((await db.getDecendants()).length).to.equal(7);

            // Test post retrieval from partial ids.
            expect((await db.getPost(['d'])).id).to.deep.equal(['a', 'd']);
            expect((await db.getPost(['b', 'd'])).id).to.deep.equal(['a', 'b', 'd']);
        });

        it('Post integrity protection', async() => {
            await expectError(
                async() => await db.addPost(['a', 'a']),
                'database integrity error: duplicate component(s) a in requested id a:a'
            );
            await expectError(
                async() => await db.addPost(['a', 'b', 'c']),
                'database integrity error: parent missing a:b for requested id a:b:c'
            );
        });

        it('Database update', async() => {
            await db.addPost(['a']);
            const post = (await db.getPost(['a']));
            expect(post.verified).to.be.equal(null);
            expect(post.num_comments).to.equal(0);
            expect(now - post.updated).to.be.lessThan(100);

            await db.updatePost(['a'], 5);
            const updatedPost = (await db.getPost(['a']));
            expect(updatedPost.num_comments).to.equal(5);
            expect(now - updatedPost.verified).to.be.lessThan(100);
            expect(updatedPost.verified).to.be.greaterThan(updatedPost.created);
        });
    });

    describe('Testing Web server', () => {
        let server;

        before(async() => {
            // Run with swagger.
            process.env.FASTIFY_SWAGGER = 'true';
            server = require('fastify')({logger: false});
            server.register(require('./routes.cjs'));
        });

        it('Health endpoint', async() => {
            const healthResponse = await server.inject({method: 'GET', url: '/health'});
            expect(healthResponse.statusCode).to.equal(200);
        });

        it('Static endpoints', async() => {
            let response;
            response = await server.inject({method: 'GET', url: '/nosuchpath'});
            expect(response.statusCode).to.equal(404);
            response = await server.inject({method: 'GET', url: '/site/nosuchpath'});
            expect(response.statusCode).to.equal(404);
            response = await server.inject({method: 'GET', url: '/site/videbate.js'});
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-type']).to.equal('application/javascript');
        });

        it('Post creation and display', async() => {
            const id = ['a'];
            const missingId = ['b'];

            const newResponse = await server.inject({method: 'POST', url: '/new', payload: {id}});
            expect(newResponse.statusCode).to.equal(201);
            expect(newResponse.json().id).to.deep.equal(id);
            expect((await db.getPost(id)).id).to.deep.equal(id);

            const showResponse = await server.inject({method: 'POST', url: '/show', payload: {id}});
            expect(showResponse.statusCode).to.equal(200);
            expect(showResponse.headers['content-type']).to.equal('text/html');
            expect(showResponse.payload.slice(0, 15)).to.equal('<!DOCTYPE html>');

            const missingResponse = await server.inject({method: 'POST', url: '/show', payload: {id: missingId}});
            expect(missingResponse.statusCode).to.equal(404);
            expect(missingResponse.headers['content-type']).to.equal('text/plain');
            expect(missingResponse.payload.slice(0, 15)).to.equal('post not found');
        });

        it('Video upload', async() => {
            const uploadGetResponse = await server.inject({method: 'GET', url: '/site/upload.html'});
            expect(uploadGetResponse.statusCode).to.equal(200);
            expect(uploadGetResponse.headers['content-type']).to.equal('text/html');
            expect(uploadGetResponse.payload).to.match(
                /<form action="\/upload" method="post" enctype="multipart\/form-data">/
            );

            const noFileUploadResponse = await server.inject({method: 'POST', url: '/upload'});
            expect(noFileUploadResponse.statusCode).to.equal(400);
            expect(noFileUploadResponse.headers['content-type']).to.equal('text/plain');
            expect(noFileUploadResponse.payload).to.equal('no file provided');

            const testMockUpload = async(fileName, uploadHandler) => {
                // Mock the upload handler.
                const storage = require('./storage.cjs');
                const originalFileFactory = storage.bucket.file;
                storage.bucket.file = (fileName) => ({createWriteStream: () => ({on: uploadHandler})});

                const form = new require('form-data')();
                form.append('video', 'content', {filename: fileName, contentType: 'video/mp4'});
                const response = await server.inject({
                    method: 'POST',
                    url: '/upload',
                    payload: form,
                    headers: {...form.getHeaders()}
                });

                // Restore the original upload handler.
                storage.bucket.file = originalFileFactory;

                return response;
            };

            const consoleError = console.error;
            console.error = () => {};
            await db.refreshDatabase();
            const fileErrorResponse = await testMockUpload('test', (event, handler) => {
                if(event === 'error') handler(new Error('test error'));
            });
            console.error = consoleError;
            expect(fileErrorResponse.statusCode).to.equal(500);
            expect(JSON.parse(fileErrorResponse.payload).message).to.equal('test error');

            const fileName = Math.random().toString(36);
            const response = await testMockUpload(fileName, (event, handler) => {
                if(event === 'finish') handler();
            });
            expect(response.statusCode).to.equal(201);
            expect(response.payload).to.equal(`file ${fileName} uploaded to google cloud storage`);
        }).timeout(10000);
    });
});
