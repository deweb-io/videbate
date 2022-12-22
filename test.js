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


describe('Testing database', () => {
    let db;
    let now;

    beforeEach(async() => {
        db = await import('./db.js');
        await db.refreshDatabase();
        now = new Date();
    });

    after(async() => {
        await db.killConnection();
    });

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
