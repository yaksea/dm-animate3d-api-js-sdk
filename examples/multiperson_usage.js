require('dotenv').config();

const { Animate3DClient, ProcessParams, Status } = require('dm-animate3d-api');

const API_SERVER_URL = process.env.DM_A3D_API_SERVER_URL || 'https://service.deepmotion.com';
const CLIENT_ID = process.env.DM_A3D_CLIENT_ID;
const CLIENT_SECRET = process.env.DM_A3D_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: DM_A3D_CLIENT_ID and DM_A3D_CLIENT_SECRET environment variables are required');
  console.error('Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

const VIDEO_PATH = 'multi_person.mp4';
const OUTPUT_DIR = './output/multi_person';

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
    console.log('Downloading results...');
    await client.download_job(data.rid, OUTPUT_DIR);
  } else if (data.error) {
    console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
  }
}

async function main() {
  try {
    console.log('Step 1: Detecting persons...');
    const detection_rid = await client.prepare_multi_person_job(VIDEO_PATH);

    const job = await client.get_job_status(detection_rid);
    if (job.status !== Status.SUCCESS) {
      console.log(`Detection failed: ${job.status}`);
      return;
    }

    console.log('\nStep 2: Assign models');
    const all_models = await client.list_character_models();
    if (all_models.length === 0) {
      console.log('No models found');
      return;
    }
    const model_id = all_models[0].id;
    const models = [
      { trackingId: '001', modelId: model_id },
      { trackingId: '002', modelId: model_id }
    ];

    console.log('\nStep 3: Processing animation...');
    const rid = await client.start_multi_person_job(
      detection_rid,
      models,
      new ProcessParams({ formats: ['bvh', 'fbx'] }),
      on_result,
      on_progress
    );

    console.log(`Processing finished, RID: ${rid}`);

    await client.close();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
