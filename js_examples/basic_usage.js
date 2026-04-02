require('dotenv').config({
  path: require('path').resolve(__dirname, '.env'),
  quiet: true,
});

const { existsSync } = require('fs');
const { Animate3DClient, ProcessParams } = require('dm-animate3d-api');
const { video: VIDEO_PATH } = require('./paths');

const API_SERVER_URL = process.env.DM_A3D_API_SERVER_URL || 'https://service.deepmotion.com';
const CLIENT_ID = process.env.DM_A3D_CLIENT_ID;
const CLIENT_SECRET = process.env.DM_A3D_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: DM_A3D_CLIENT_ID and DM_A3D_CLIENT_SECRET environment variables are required');
  console.error('Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

const OUTPUT_DIR = './output';

if (!existsSync(VIDEO_PATH)) {
  console.error(`Video not found: ${VIDEO_PATH}`);
  process.exit(1);
}

const client = new Animate3DClient(
  API_SERVER_URL,
  CLIENT_ID,
  CLIENT_SECRET
);

function on_progress(data) {
  if (data.position_in_queue) {
    console.log(`Position in queue: ${data.position_in_queue})`);
  } else {
    console.log(`Progress: ${data.progress_percent}%`);
  }
}

async function on_result(data) {
  if (data.result) {
    console.log('Job completed successfully!');
    if (data.result.output) {
      console.log(`Output file: ${data.result.output}`);
    }
    console.log('Downloading results...');
    await client.download_job(data.rid, OUTPUT_DIR);
  } else if (data.error) {
    console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
  }
}

async function main() {
  try {
    const balance = await client.get_credit_balance();
    console.log(`Credit balance: ${balance}`);

    if (balance <= 0) {
      console.log('No credit, cannot process job');
      return;
    }

    const all_models = await client.list_character_models();
    if (all_models.length === 0) {
      console.log('No models found');
      return;
    }
    const model_id = all_models[0].id;

    const params = new ProcessParams({
      formats: ['bvh', 'fbx', 'mp4'],
      model_id: model_id,
      track_face: 1,
      track_hand: 1
    });

    console.log(`\n=== Processing ${VIDEO_PATH} ===`);
    const rid = await client.start_new_job(
      VIDEO_PATH,
      params,
      undefined,
      on_result,
      on_progress
    );
    console.log(`Job finished, RID: ${rid}`);

    console.log('\n=== Done! ===');

    await client.close();

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

main();
