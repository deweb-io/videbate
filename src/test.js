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

describe('Database dependant tests', () => { // We should mock the database for any non-db tests.
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

        it('Tests post integrity protection', async() => {
            await expectError(
                async() => await db.addPost(['a', 'a']),
                'database integrity threatened: duplicate components in requested id (a:a - a)'
            );
            await expectError(
                async() => await db.addPost(['a', 'b', 'c']),
                'database integrity threatened: a:b:c has no parent in the posts table'
            );
        });

        it('Tests database update', async() => {
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
            await server.close();
        });

        it('Tests 404', async() => {
            const healthResponse = await server.inject({method: 'GET', url: '/nosuchpath'});
            expect(healthResponse.statusCode).to.equal(404);
        });

        it('Tests health endpoint', async() => {
            const healthResponse = await server.inject({method: 'GET', url: '/health'});
            expect(healthResponse.statusCode).to.equal(200);
        });

        it('Tests post creation and display', async() => {
            // This is currently an actual post in creator-eco-stage. It probably shouldn't be :)
            const id = ['SK5we2vyudZoUwF5ee6g'];

            const newResponse = await server.inject({method: 'POST', url: '/new', payload: {id}});
            expect(newResponse.statusCode).to.equal(201);
            expect(newResponse.json().id).to.deep.equal(id);
            expect((await db.getPost(id)).id).to.deep.equal(id);

            await server.inject({method: 'POST', url: '/new', payload: {id}});
            const showResponse = await server.inject({method: 'POST', url: '/show', payload: {id}});
            expect(showResponse.statusCode).to.equal(200);
            expect(showResponse.headers['content-type']).to.equal('text/html');
            expect(showResponse.payload.slice(0, 15)).to.equal('<!DOCTYPE html>');
        });
    });
});
