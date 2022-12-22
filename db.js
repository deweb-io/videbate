import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();
const SQL = postgres();

export const health = async() => await SQL`SELECT 1 FROM posts LIMIT 1` && 'OK';

export const refreshDatabase = async() => {
    console.warn('refreshing the database...');
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
    console.warn('database refreshed!');
};

export const getPosts = async() => await SQL`SELECT * FROM posts`;

export default {
    health,
    getPosts
};
