CREATE TABLE posts(
        id TEXT PRIMARY KEY,
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified TIMESTAMP NULL,
        num_comments INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX posts_verified ON posts(verified);

CREATE TABLE user_events(
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        event TEXT NOT NULL,
        data JSON NOT NULL,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL
);
CREATE INDEX user_events_post_id ON user_events(post_id);
