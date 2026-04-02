require('dotenv').config({
  path: require('path').resolve(__dirname, '.env'),
  quiet: true,
});

const { existsSync } = require('fs');
const { Animate3DClient, ProcessParams } = require('dm-animate3d-api');
const { video: sampleVideo } = require('./paths');

const API_SERVER_URL = process.env.DM_A3D_API_SERVER_URL || 'https://service.deepmotion.com';
const CLIENT_ID = process.env.DM_A3D_CLIENT_ID;
const CLIENT_SECRET = process.env.DM_A3D_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: DM_A3D_CLIENT_ID and DM_A3D_CLIENT_SECRET environment variables are required');
  console.error('Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

const client = new Animate3DClient(
  API_SERVER_URL,
  CLIENT_ID,
  CLIENT_SECRET
);

let done_job_count = 0;

function on_progress(data) {
  if (data.position_in_queue) {
    console.log(`Position of Job[${data.rid}] in queue: ${data.position_in_queue})`);
  } else {
    console.log(`Progress of Job[${data.rid}]: ${data.progress_percent}%`);
  }
}

function on_result(data) {
  if (data.result) {
    console.log(`Job[${data.rid}] completed successfully!`);
  } else if (data.error) {
    console.error(`Job[${data.rid}] failed: ${data.error.message} (Code: ${data.error.code})`);
  }
  done_job_count++;
}

async function main() {
  try {
    const all_models = await client.list_character_models();
    if (all_models.length === 0) {
      console.log('No models found');
      return;
    }
    const model_id = all_models[0].id;

    const video_files = [sampleVideo];
    const params = new ProcessParams({
      formats: ['bvh', 'fbx'],
      model_id: model_id
    });

    console.log('=== Submitting jobs ===');
    const rids = [];
    for (const video of video_files) {
      if (!existsSync(video)) {
        console.log(`Skipping ${video} (file not found)`);
        continue;
      }

      const rid = await client.start_new_job(
        video,
        params,
        undefined,
        on_result,
        on_progress,
        10,
        false
      );
      rids.push({ video, rid });
      console.log(`Submitted: ${video} -> Job ID: ${rid}`);
    }

    while (done_job_count < rids.length) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('\n=== All jobs processed ===');

    await client.close();

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

main();
