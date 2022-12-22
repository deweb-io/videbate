import {expect} from 'chai';

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

describe('Database dependant tests', () => {
    let db;
    let now;

    before(async() => {
        db = await import('./db.js');
    });

    beforeEach(async() => {
        await db.refreshDatabase();
        now = new Date();
    });

    after(async() => {
        await db.killConnection();
    });

    describe('Testing database', () => {
        it('Tests post insert and retrieval', async() => {
            await db.addPost('1');
            await db.addPost('1:2');
            await db.addPost('1:2:3');
            const posts = await db.getPosts();
            expect(posts.length).to.equal(3);
            expect(posts[0].id).to.equal('1');
            expect(posts[0].verified).to.be.equal(null);
            expect(posts[0].num_comments).to.equal(0);
            expect(now - posts[0].created).to.be.lessThan(100);
            expect(now - posts[0].updated).to.be.lessThan(100);
        });

        it('Tests post integrity protection', async() => {
            await expectError(
                async() => await db.addPost('1:1'),
                'database integrity threatened: duplicate components in requested id (1:1 - 1)'
            );
            await expectError(
                async() => await db.addPost('1:3:4'),
                'database integrity threatened: 1:3:4 has no parent in the posts table'
            );
        });

        it('Tests database update', async() => {
            await db.addPost('1');
            const post = (await db.getPosts())[0];
            expect(post.verified).to.be.equal(null);
            expect(post.num_comments).to.equal(0);
            expect(now - post.updated).to.be.lessThan(100);

            await db.updatePost('1', 5);
            const updatedPost = (await db.getPosts())[0];
            expect(updatedPost.num_comments).to.equal(5);
            expect(now - updatedPost.verified).to.be.lessThan(100);
            expect(updatedPost.verified).to.be.greaterThan(updatedPost.created);
        });
    });

    describe('Testing Web server', () => {
        let server;
        let db;

        before(async() => {
            db = await import('./db.js');
            await db.refreshDatabase();

            server = (await import('fastify')).default({logger: false});
            server.register(await import('./routes.js'));
        });

        beforeEach(async() => {
            await db.refreshDatabase();
        });

        after(async() => {
            await db.killConnection();
            await server.close();
        });

        it('Tests health endpoint', async() => {
            const healthResponse = await server.inject({method: 'GET', url: '/health'});
            expect(healthResponse.statusCode).to.equal(200);
        });

        it('Tests post creation endpoint', async() => {
            const newResponse = await server.inject({method: 'POST', url: '/new', payload: {id: '1'}});
            expect(newResponse.statusCode).to.equal(201);
            expect(newResponse.json().id).to.equal('1');
            expect((await db.getPosts())[0].id).to.equal('1');
        });

        it('Tests post display endpoint', async() => {
            const showResponse = await server.inject({method: 'POST', url: '/show', payload: {id: '1'}});
            expect(showResponse.statusCode).to.equal(200);
            expect(showResponse.headers['content-type']).to.equal('text/html');
            expect(showResponse.payload.slice(0, 15)).to.equal('<!DOCTYPE html>');
        });
    });
});
