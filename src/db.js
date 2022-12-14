import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const psql = postgres();

// Report database connection and health.
export const health = () => psql`SELECT 1 FROM posts LIMIT 1` && 'OK';

// Database initialization - will eventually be moved to migrations.
export const refreshDatabase = async() => {
    console.warn(`refreshing database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);
    await psql`
        DROP TABLE IF EXISTS posts;
    `;
    await psql`CREATE TABLE posts(
        id TEXT PRIMARY KEY,
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified TIMESTAMP NULL,
        num_comments INTEGER NOT NULL DEFAULT 0
    )`;
    await psql`CREATE INDEX posts_verified ON posts(verified)`;
    console.warn(`database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE} refresehd`);
};

// Post ID conversion.
const ID_DELIMITER = ':';
const idFromDb = (dbId) => dbId.split(ID_DELIMITER);
const idToDb = (id) => id.join(ID_DELIMITER);
const partialIdToDb = (id) => `%${idToDb(id)}`;

// Database Integrity Protection
const getParentId = (id) => id.slice(0, -1);
const hasParent = async(id) => (await psql`SELECT 1 FROM posts WHERE id = ${idToDb(getParentId(id))}`).length === 1;
const validateId = async(id) => {
    if(id.length > 1) {
        if(new Set(id).size !== id.length) {
            throw new Error(`database integrity error: duplicate component(s) ${
                id.filter((component, index) => id.indexOf(component) !== index).join(', ')
            } in requested id ${idToDb(id)}`);
        }
        if(!await hasParent(id)) {
            throw new Error(`database integrity error: parent missing ${
                idToDb(id.slice(0, -1))
            } for requested id ${idToDb(id)}`);
        }
    }
    return true;
};

// Posts should only ever be inserted with this function!
export const addPost = async(id) => {
    await validateId(id);
    await psql`INSERT INTO posts(id) VALUES (${idToDb(id)})`;
    return {id};
};

// Posts should only ever be updated with this function!
export const updatePost = async(id, numComments) => await psql`UPDATE posts SET
    verified = CURRENT_TIMESTAMP,
    updated = CURRENT_TIMESTAMP,
    num_comments = ${numComments}
WHERE id = ${idToDb(id)}`;

export const getPost = async(partialId) => {
    const posts = await psql`SELECT * FROM posts
        WHERE id LIKE ${partialIdToDb(partialId)}
        ORDER BY LENGTH(id), id
    `;
    if(posts.length === 0) {
        throw new Error(`no posts found for partial id ${idToDb(partialId)}`);
    }
    return {...posts[0], id: idFromDb(posts[0].id)};
};

export const getChildren = async(id) => (await psql`SELECT id FROM posts
    WHERE id LIKE ${idToDb([...(id || []), '%'])}
    AND id NOT LIKE ${idToDb([...(id || []), '%', '%'])}
`).map((post) => post.id);

export const getDecendants = async(id) => (await psql`SELECT id FROM posts
    WHERE id LIKE ${idToDb([...(id || []), '%'])}
`).map((post) => post.id);

export const getPostData = async(partialId) => {
    const post = await getPost(partialId);
    return {...post, children: await getChildren(post.id)};
};
