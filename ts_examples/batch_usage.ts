import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env'), quiet: true });
import { Animate3DClient, ProcessParams } from '../src';
import type { ProgressCallback, ResultCallback } from '../src';
import { assetPaths } from './paths';

const API_SERVER_URL = process.env.DM_A3D_API_SERVER_URL ?? 'https://service.deepmotion.com';
const CLIENT_ID = process.env.DM_A3D_CLIENT_ID;
const CLIENT_SECRET = process.env.DM_A3D_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: DM_A3D_CLIENT_ID and DM_A3D_CLIENT_SECRET environment variables are required');
  console.error('Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

const client = new Animate3DClient(API_SERVER_URL, CLIENT_ID, CLIENT_SECRET);

let done_job_count = 0;

const onProgress: ProgressCallback = (data) => {
  if (data.position_in_queue) {
    console.log(`Position of Job[${data.rid}] in queue: ${data.position_in_queue})`);
  } else {
    console.log(`Progress of Job[${data.rid}]: ${data.progress_percent}%`);
  }
};

const onResult: ResultCallback = (data) => {
  if (data.result) {
    console.log(`Job[${data.rid}] completed successfully!`);
  } else if (data.error) {
    console.error(`Job[${data.rid}] failed: ${data.error.message} (Code: ${data.error.code})`);
  }
  done_job_count++;
};

async function main(): Promise<void> {
  try {
    const all_models = await client.list_character_models();
    if (all_models.length === 0) {
      console.log('No models found');
      return;
    }
    const model_id = all_models[0].id;

    const video_files = [assetPaths.video];
    const params = new ProcessParams({
      formats: ['bvh', 'fbx'],
      model_id,
    });

    console.log('=== Submitting jobs ===');
    const rids: Array<{ video: string; rid: string }> = [];
    for (const video of video_files) {
      if (!existsSync(video)) {
        console.log(`Skipping ${video} (file not found)`);
        continue;
      }

      const rid = await client.start_new_job(
        video,
        params,
        undefined,
        onResult,
        onProgress,
        10,
        false
      );
      rids.push({ video, rid });
      console.log(`Submitted: ${video} -> Job ID: ${rid}`);
    }

    while (done_job_count < rids.length) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log('\n=== All jobs processed ===');

    await client.close();
  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

void main();
