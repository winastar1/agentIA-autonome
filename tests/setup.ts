import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.ENABLE_PERSISTENT_MEMORY = 'false';
process.env.ENABLE_VECTOR_EMBEDDINGS = 'false';

jest.setTimeout(30000);
