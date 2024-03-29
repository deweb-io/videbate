CREATE TABLE posts(
        id TEXT PRIMARY KEY,
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified TIMESTAMP NULL,
        num_comments INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX posts_verified ON posts(verified);
