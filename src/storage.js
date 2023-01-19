import {Storage} from '@google-cloud/storage';

// GOOGLE_APPLICATION_CREDENTIALS must be a secret environment variable.
const bucket = new Storage({projectId: process.env.GCP_PROJECT_ID,
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)}).bucket(process.env.GCP_BUCKET_NAME);

export const uploadHandler = async(file) => {
    return new Promise((resolve, reject) => {
        const gcsFile = bucket.file(`videbate/${file.originalname}`);
        const stream = gcsFile.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });
        stream.on('error', (err) => {
            reject(err);
        });

        stream.on('finish', (err) => {
            resolve(`File ${file.originalname} was uploaded to GCS.`);
        });

        stream.end(file.buffer);
    });
};
