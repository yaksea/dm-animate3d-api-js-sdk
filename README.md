# Animate 3D JavaScript/TypeScript SDK

JavaScript/TypeScript SDK for the Animate 3D REST API. All methods are asynchronous and return Promises.

## Installation

```bash
npm install dm-animate3d-api
```

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in your project root:

```bash
DM_A3D_API_SERVER_URL=https://service.deepmotion.com
DM_A3D_CLIENT_ID=your_client_id
DM_A3D_CLIENT_SECRET=your_client_secret
```

Or set environment variables directly:

```bash
export DM_A3D_CLIENT_ID=your_client_id
export DM_A3D_CLIENT_SECRET=your_client_secret
```

### 2. Basic Usage

```javascript
require('dotenv').config();

const { Animate3DClient, ProcessParams } = require('dm-animate3d-api');

async function main() {
  try {
    const client = new Animate3DClient(
      process.env.DM_A3D_API_SERVER_URL || 'https://service.deepmotion.com',
      process.env.DM_A3D_CLIENT_ID,
      process.env.DM_A3D_CLIENT_SECRET
    );

    const balance = await client.get_credit_balance();
    console.log(`Credit balance: ${balance}`);

    const all_models = await client.list_character_models();
    const model_id = all_models[0]?.id;

    if (!model_id) {
      console.error('No character models available');
      return;
    }

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
          console.log(`Output: ${JSON.stringify(data.result.output)}`);
        }
      } else if (data.error) {
        console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
      }
    }

    const params = new ProcessParams({
      formats: ['bvh', 'fbx', 'mp4'],
      model_id: model_id,
      track_face: 1,
      track_hand: 1
    });

    console.log('Starting job...');
    const rid = await client.start_new_job(
      'video.mp4',
      params,
      'test_video',
      on_result,
      on_progress
    );
    console.log(`Job finished, RID: ${rid}`);

    await client.close();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### TypeScript Usage

```typescript
import 'dotenv/config';
import { Animate3DClient, ProcessParams } from 'dm-animate3d-api';

async function main(): Promise<void> {
  try {
    const client = new Animate3DClient(
      process.env.DM_A3D_API_SERVER_URL || 'https://service.deepmotion.com',
      process.env.DM_A3D_CLIENT_ID!,
      process.env.DM_A3D_CLIENT_SECRET!
    );

    const balance: number = await client.get_credit_balance();
    console.log(`Credit balance: ${balance}`);

    const all_models = await client.list_character_models();
    const model_id = all_models[0]?.id;

    if (!model_id) {
      console.error('No character models available');
      return;
    }

    const on_progress = (data: { rid: string; progress_percent: number; position_in_queue: number }): void => {
      if (data.position_in_queue) {
        console.log(`Position in queue: ${data.position_in_queue})`);
      } else {
        console.log(`Progress: ${data.progress_percent}%`);
      }
    };

    const on_result = async (data: { rid: string; result?: { input: string[]; output: any }; error?: { code: string; message: string } }): Promise<void> => {
      if (data.result) {
        console.log('Job completed successfully!');
        if (data.result.output) {
          console.log(`Output: ${JSON.stringify(data.result.output)}`);
        }
      } else if (data.error) {
        console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
      }
    };

    const params = new ProcessParams({
      formats: ['bvh', 'fbx', 'mp4'],
      model_id: model_id,
      track_face: 1,
      track_hand: 1
    });

    console.log('Starting job...');
    const rid: string = await client.start_new_job(
      'video.mp4',
      params,
      'test_video',
      on_result,
      on_progress
    );
    console.log(`Job finished, RID: ${rid}`);

    await client.close();

  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

main();
```

## API Reference

### Client Initialization

```javascript
const client = new Animate3DClient(
  api_server_url,      // API server URL
  client_id,           // Client ID
  client_secret,       // Client secret
  timeout              // Request timeout in seconds (optional, default: none)
);
```

### Character Model API

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `list_character_models` | model_id?, search_token?, only_custom? | Promise<CharacterModel[]> | List available models |
| `upload_character_model` | source, name?, create_thumb? | Promise<string> (model_id) | Upload or store a model |
| `delete_character_model` | model_id | Promise<number> (count) | Delete a model |

### Job API

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `start_new_job` | video_path, params?, name?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Start a new animation job |
| `prepare_multi_person_job` | video_path, name?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Detect persons in video |
| `start_multi_person_job` | rid_mp_detection, models, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Process multi-person animation |
| `rerun_job` | rid, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (new_rid) | Rerun with different params |
| `get_job_status` | rid | Promise<JobStatus> | Get current job status |
| `list_jobs` | status? | Promise<Job[]> | List jobs by status |
| `download_job` | rid, output_dir? | Promise<DownloadLink> | Download job results |

### Account API

| Method | Returns | Description |
|--------|---------|-------------|
| `get_credit_balance` | Promise<number> | Get account credit balance |

## Callback Data Structures

### ProgressCallbackData

```typescript
interface ProgressCallbackData {
  rid: string;
  progress_percent: number;
  position_in_queue: number;
}
```

### ResultCallbackData

```typescript
interface ResultCallbackData {
  rid: string;
  result?: JobResult;
  error?: JobError;
}

interface JobResult {
  input: string[];
  output: any;
}

interface JobError {
  code: string;
  message: string;
}
```

## ProcessParams Reference

```javascript
const params = new ProcessParams({
  // Output formats
  formats: ['bvh', 'fbx', 'mp4', 'glb'],

  // Character model (single person)
  model_id: 'model_id',

  // Tracking options
  track_face: 1,                    // 0=off, 1=on
  track_hand: 1,                    // 0=off, 1=on
  sim: 1,                           // Physics simulation: 0=off, 1=on

  // Foot locking
  foot_locking_mode: 'auto',        // "auto", "always", "never", "grounding"

  // Video processing
  video_speed_multiplier: 2.0,      // 1.0-8.0 for slow-motion videos
  pose_filtering_strength: 0.5,     // 0.0-1.0, higher = smoother
  upper_body_only: false,           // Track upper body only
  root_at_origin: false,            // True to keep root at origin

  // Trim and crop
  trim: [1.0, 10.0],                // [start_sec, end_sec]
  crop: [0.1, 0.1, 0.9, 0.9],       // [left, top, right, bottom] normalized

  // MP4 rendering options
  render_sbs: 0,                    // 0=character only, 1=side-by-side
  render_bg_color: [0, 177, 64, 0], // RGBA for green screen
  render_backdrop: 'studio',        // Background style
  render_shadow: 1,                 // 0=off, 1=on
  render_include_audio: 1,          // 0=off, 1=on
  render_cam_mode: 0,               // 0=Cinematic, 1=Fixed, 2=Face
});
```

## Error Handling

```javascript
const { Animate3DError, AuthenticationError, APIError, ValidationError, TimeoutError } = require('dm-animate3d-api');

try {
  // SDK operations
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof APIError) {
    console.error('API error:', error.message, 'Status code:', error.status_code);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Operation timed out:', error.message);
  } else if (error instanceof Animate3DError) {
    console.error('Animate 3D error:', error.message);
  } else {
    console.error('General error:', error.message);
  }
}

// Job errors are returned in the result callback via ResultCallbackData.error
function on_result(data) {
  if (data.error) {
    console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DM_A3D_API_SERVER_URL` | No | `https://service.deepmotion.com` | API server URL |
| `DM_A3D_CLIENT_ID` | Yes | - | Client ID |
| `DM_A3D_CLIENT_SECRET` | Yes | - | Client secret |
| `HTTP_PROXY` | No | - | HTTP proxy URL (e.g., `http://127.0.0.1:7078`) |
| `HTTPS_PROXY` | No | - | HTTPS proxy URL |

## Proxy Configuration

The SDK supports HTTP/HTTPS proxy through environment variables. This is useful when running in environments that require proxy configuration:

```bash
# In .env file
HTTP_PROXY=http://127.0.0.1:7078
HTTPS_PROXY=http://127.0.0.1:7078

# Or via environment
export HTTP_PROXY=http://127.0.0.1:7078
export HTTPS_PROXY=http://127.0.0.1:7078
```

## Requirements

- Node.js 14.0+
- dotenv (for environment variable loading)
- axios (HTTP client with proxy support)

## License

MIT License

## Support

For issues and questions, please contact DeepMotion support.