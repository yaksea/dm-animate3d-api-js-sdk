require('dotenv').config();

const { Animate3DClient } = require('dm-animate3d-api');

const API_SERVER_URL = process.env.DM_A3D_API_SERVER_URL || 'https://service.deepmotion.com';
const CLIENT_ID = process.env.DM_A3D_CLIENT_ID;
const CLIENT_SECRET = process.env.DM_A3D_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: DM_A3D_CLIENT_ID and DM_A3D_CLIENT_SECRET environment variables are required');
  console.error('Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

async function main() {
  try {
    const client = new Animate3DClient(
      API_SERVER_URL,
      CLIENT_ID,
      CLIENT_SECRET
    );

    console.log('=== Listing All Models ===');
    const all_models = await client.list_character_models();
    console.log('\nAll Models:');
    all_models.forEach(model => {
      console.log(`  ${model.name} (ID: ${model.id}, Platform: ${model.platform})`);
    });

    console.log('\n=== Uploading Custom Model ===');
    const model_id = await client.upload_character_model(
      './test_character.glb',
      'My Custom Character'
    );
    console.log(`Uploaded model ID: ${model_id}`);

    console.log('\n=== Deleting Model ===');
    const deleted_count = await client.delete_character_model(model_id);
    console.log(`Deleted ${deleted_count} model(s)`);

    if (all_models.length > 0) {
      console.log('\n=== Get Specific Model ===');
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

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
