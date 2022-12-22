import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();
const SQL = postgres();

export const health = () => SQL`SELECT 1 FROM posts LIMIT 1` && 'OK';

// Will eventually be moved to migrations.
export const refreshDatabase = async() => {
    console.warn(`refreshing database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);
    await SQL`
        DROP TABLE IF EXISTS posts;
    `;
    await SQL`CREATE TABLE posts(
        id TEXT PRIMARY KEY,
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified TIMESTAMP NULL,
        num_comments INTEGER NOT NULL DEFAULT 0
    )`;
    await SQL`CREATE INDEX posts_verified ON posts(verified)`;
    console.warn(`database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE} refresehd`);
};

export const getPosts = () => SQL`SELECT * FROM posts`;

const getParentId = (id) => id.split(':').slice(0, -1).join(':');

const hasParent = async(id) => (await SQL`SELECT 1 FROM posts WHERE id = ${getParentId(id)}`).length === 1;

// Database Integrity Protection

const validateId = async(id) => {
    const components = id.split(':');
    if(components.length > 1) {
        if(new Set(components).size !== components.length) {
            throw new Error(`database integrity threatened: duplicate components in requested id (${id} - ${
                components.filter((component, index) => components.indexOf(component) !== index).join(', ')
            })`);
        }
        if(!await hasParent(id)) {
            throw new Error(`database integrity threatened: ${id} has no parent in the posts table`);
        }
    }
    return true;
};

// Posts should only ever be inserted with this function!
export const addPost = async(id) => {
    await validateId(id);
    await SQL`INSERT INTO posts(id) VALUES (${id})`;
    return {id};
};

// Posts should only ever be updated with this function!
export const updatePost = async(id, numComments) => await SQL`UPDATE posts SET
    verified = CURRENT_TIMESTAMP,
    updated = CURRENT_TIMESTAMP,
    num_comments = ${numComments}
WHERE id = ${id}`;

// Beware - calling this really closes the connection to the database till the module is reloaded.
export const killConnection = () => SQL.end();

export default {
    health,
    getPosts
};
