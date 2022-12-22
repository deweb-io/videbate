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

    beforeEach(async() => {
        db = await import('./db.js');
        await db.refreshDatabase();
    });

    after(async() => {
        await db.killConnection();
    });

    it('Tests database integrity protection', async() => {
        await db.refreshDatabase();
        await db.addPost('1');
        await db.addPost('1:2');
        await db.addPost('1:2:3');

        await expectError(
            async() => await db.addPost('1:1'),
            'database integrity threatened: duplicate components in requested id (1:1 - 1)'
        );
        await expectError(
            async() => await db.addPost('1:3:4'),
            'database integrity threatened: 1:3:4 has no parent in the posts table'
        );
    });
});
