import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();
const SQL = postgres();

const init = async() => {
    await SQL`
        DROP TABLE IF EXISTS posts;
    `;
    await SQL`
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY
        )
    `;
    for(let i = 0; i < 10; i++) {
        await SQL`
            INSERT INTO posts (id) VALUES (${i});
        `;
        for(let j = 0; j < 10; j++) {
            await SQL`
                INSERT INTO posts (id) VALUES (${`${i}:${j}`})
            `;
        }
    }
};

const getPosts = async() => {
    return await SQL`SELECT * FROM posts`;
};

export {
    init,
    getPosts
};
