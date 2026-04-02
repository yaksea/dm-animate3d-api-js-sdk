require('dotenv').config({
  path: require('path').resolve(__dirname, '.env'),
  quiet: true,
});

const { Animate3DClient, ProcessParams } = require('dm-animate3d-api');

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

function on_progress(data) {
  if (data.position_in_queue) {
    console.log(`Position in queue: ${data.position_in_queue})`);
  } else {
    console.log(`Progress: ${data.progress_percent}%`);
  }
}

function on_result(data) {
  if (data.result) {
    console.log('Job completed successfully!');
    if (data.result.output) {
      console.log(`Output: ${data.result.output}`);
    }
  } else if (data.error) {
    console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
  }
}

async function main() {
  try {
    const jobs = await client.list_jobs();
    if (jobs.length === 0) {
      console.log('No job to rerun');
      return;
    }

    console.log('Starting initial job...');
    const rid = jobs[0].rid;
    console.log(`Initial job RID: ${rid}`);

    console.log('\nRerunning job with new parameters...');
    const all_models = await client.list_character_models();
    if (all_models.length === 0) {
      console.log('No models found');
      return;
    }
    const model_id = all_models[0].id;
    const new_params = new ProcessParams({
      model_id: model_id,
      formats: ['fbx', 'glb'],
      track_face: 1
    });

    try {
      const new_rid = await client.rerun_job(
        rid,
        new_params,
        on_result,
        on_progress
      );
      console.log(`Job finished, RID: ${new_rid}`);

    } catch (error) {
      console.error(`Error rerunning job: ${error instanceof Error ? error.message : error}`);
      console.error('Note: This example requires a valid RID from a previous job.');
    }

    await client.close();

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

main();
