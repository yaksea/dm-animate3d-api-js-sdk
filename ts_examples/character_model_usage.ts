import {config} from 'dotenv';
import {existsSync} from 'fs';
import {resolve} from 'path';
import {Animate3DClient} from '../src';
import {assetPaths} from './paths';

config({path: resolve(__dirname, '.env'), quiet: true});

const API_SERVER_URL = process.env.DM_A3D_API_SERVER_URL ?? 'https://service.deepmotion.com';
const CLIENT_ID = process.env.DM_A3D_CLIENT_ID;
const CLIENT_SECRET = process.env.DM_A3D_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: DM_A3D_CLIENT_ID and DM_A3D_CLIENT_SECRET environment variables are required');
    console.error('Copy .env.example to .env and fill in your credentials');
    process.exit(1);
}

const GLB_PATH = assetPaths.testCharacterGlb;

async function main(): Promise<void> {
    try {
        if (!existsSync(GLB_PATH)) {
            console.error(`GLB not found: ${GLB_PATH}`);
            process.exit(1);
        }

        const client = new Animate3DClient(API_SERVER_URL, CLIENT_ID!, CLIENT_SECRET!);

        console.log('=== Listing All Models ===');
        const all_models = await client.list_character_models();
        console.log('\nAll Models:');
        all_models.forEach((model) => {
            console.log(`  ${model.name} (ID: ${model.id}, Platform: ${model.platform})`);
        });

        console.log('=== Uploading Custom Model ===');
        const model_id = await client.upload_character_model(GLB_PATH, 'My Custom Character');
        console.log(`Uploaded model ID: ${model_id}`);

        console.log('=== Deleting Model ===');
        const deleted_count = await client.delete_character_model(model_id);
        console.log(`Deleted ${deleted_count} model(s)`);

        if (all_models.length > 0) {
            const first_model_id = all_models[0].id;
            const specific_models = await client.list_character_models(first_model_id);
            if (specific_models.length > 0) {
                const model = specific_models[0];
                console.log(`Model: ${model.name}`);
                console.log(`  ID: ${model.id}`);
                console.log(`  Platform: ${model.platform}`);
                console.log(`  Rig ID: ${model.rigId}`);
                if (model.ctime) {
                    console.log(`  Created: ${model.ctime}`);
                }
            }
        }

        console.log('\n=== Done! ===');

        await client.close();
    } catch (error: unknown) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

void main();
