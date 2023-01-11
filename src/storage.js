import {Storage} from '@google-cloud/storage';

export const bucket = new Storage({projectId: process.env.GCP_PROJECT_ID}).bucket(process.env.GCP_BUCKET_NAME);
