import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import axios from 'axios';
import {ProcessParams} from './data/params';
import {CharacterModel} from './data/character';
import {Job} from './data/job';
import {JobStatus} from './data/job-status';
import {DownloadLink} from './data/response';
import {Status} from './data/enums';
import {
    JobError,
    JobResult,
    ProgressCallback,
    ProgressCallbackData,
    ResultCallback,
    ResultCallbackData
} from './data/callback';
import {APIError, AuthenticationError, TimeoutError, ValidationError} from './exceptions';
import {
    ends_with_mp_tracked_id,
    ensure_directory_exists,
    file_exists,
    get_file_extension,
    get_file_name_without_ext,
    is_http_url
} from './utils';

function isAxiosError(error: any): boolean {
    return error && error.isAxiosError === true;
}

export class Animate3DClient {
    private api_server_url: string;
    private client_id: string;
    private client_secret: string;
    private timeout?: number;
    private _authenticated: boolean = false;
    private _cookies: Record<string, string> = {};
    private readonly _httpAgent = new http.Agent({keepAlive: true});
    private readonly _httpsAgent = new https.Agent({keepAlive: true});

    constructor(
        api_server_url: string,
        client_id: string,
        client_secret: string,
        timeout?: number
    ) {
        this.api_server_url = api_server_url.replace(/\/$/, '');
        this.client_id = client_id;
        this.client_secret = client_secret;
        this.timeout = timeout;
    }

    private _get_axios_config() {
        const config: any = {
            httpAgent: this._httpAgent,
            httpsAgent: this._httpsAgent,
        };
        if (this.timeout) {
            config.timeout = this.timeout * 1000;
        }
        return config;
    }

    private async _authenticate(): Promise<void> {
        const auth_url = `${this.api_server_url}/session/auth`;
        const auth = Buffer.from(`${this.client_id}:${this.client_secret}`).toString('base64');

        try {
            const response: any = await axios.get(auth_url, {
                headers: {
                    'Authorization': `Basic ${auth}`
                },
                ...this._get_axios_config()
            });

            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
                cookies.forEach(cookie => {
                    const [name, value] = cookie.trim().split('=');
                    if (name && value) {
                        this._cookies[name] = value;
                    }
                });

                if (this._cookies['dmsess']) {
                    this._authenticated = true;
                } else {
                    throw new AuthenticationError('Failed to get session cookie');
                }
            } else {
                throw new AuthenticationError('Failed to get session cookie');
            }
        } catch (error: any) {
            if (isAxiosError(error)) {
                if (error.response) {
                    throw new AuthenticationError(`Authentication failed: ${error.response.statusText}`);
                } else if (error.request) {
                    throw new AuthenticationError(`Authentication failed: No response received`);
                }
                throw new AuthenticationError(`Authentication failed: ${error.message}`);
            }
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(`Authentication failed: ${error.message}`);
        }
    }

    private async _request(
        method: string,
        path: string,
        params?: Record<string, any>,
        json_data?: Record<string, any>,
        data?: Buffer
    ): Promise<any> {
        if (!this._authenticated) {
            await this._authenticate();
        }

        const url = new URL(`${this.api_server_url}${path}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }

        const requestHeaders: Record<string, string> = {};

        const cookieString = Object.entries(this._cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        if (cookieString) {
            requestHeaders['Cookie'] = cookieString;
        }

        try {
            let response: any;

            if (json_data) {
                requestHeaders['Content-Type'] = 'application/json';
                response = await axios({
                    method,
                    url: url.toString(),
                    headers: requestHeaders,
                    data: json_data,
                    ...this._get_axios_config()
                });
            } else if (data) {
                response = await axios({
                    method,
                    url: url.toString(),
                    headers: requestHeaders,
                    data: data,
                    ...this._get_axios_config()
                });
            } else {
                response = await axios({
                    method,
                    url: url.toString(),
                    headers: requestHeaders,
                    ...this._get_axios_config()
                });
            }

            return response.data;
        } catch (error: any) {
            if (isAxiosError(error)) {
                if (error.response) {
                    let error_msg = `API request failed with status ${error.response.status}`;
                    const respData = error.response.data;
                    if (respData && respData.message) {
                        error_msg = respData.message;
                    }
                    throw new APIError(error_msg, error.response.status);
                } else if (error.request) {
                    throw new APIError(`Request failed: No response received`);
                }
                throw new APIError(`Request failed: ${error.message}`);
            }
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(`Request failed: ${error.message}`);
        }
    }

    private async _upload_video(file_path: string, name?: string): Promise<string> {
        if (!file_exists(file_path)) {
            throw new ValidationError(`File does not exist: ${file_path}`);
        }

        if (!name) {
            name = path.basename(file_path);
        }

        const file_data = fs.readFileSync(file_path);
        const params = {name, resumable: '0', fileSize: file_data.length};
        const upload_data = await this._request('GET', '/upload', params);
        const gcs_url = upload_data.url;


        const headers = {
            'Content-Length': String(file_data.length),
            'Content-Type': 'application/octet-stream'
        };

        try {
            await axios.put(gcs_url, file_data, {
                headers,
                ...this._get_axios_config()
            });
        } catch (error: any) {
            if (isAxiosError(error)) {
                throw new APIError(`Upload failed: ${error.message}`);
            }
            throw new APIError(`Upload failed: ${error.message}`);
        }

        return gcs_url;
    }

    private async _process_video(
        url?: string,
        rid?: string,
        rid_mp_detection?: string,
        params?: ProcessParams
    ): Promise<string> {
        if (!params) {
            params = new ProcessParams();
        }

        const process_data: Record<string, any> = {
            processor: 'video2anim',
            params: params.toParamsList()
        };

        if (url) {
            process_data.url = url;
        }
        if (rid) {
            process_data.rid = rid;
        }
        if (rid_mp_detection) {
            process_data.rid_mp_detection = rid_mp_detection;
        }

        const result = await this._request('POST', '/process', undefined, process_data);
        return result.rid;
    }

    async list_character_models(
        model_id?: string,
        search_token?: string,
        only_custom?: boolean
    ): Promise<CharacterModel[]> {
        const params: Record<string, any> = {};
        if (model_id) {
            params.modelId = model_id;
        }
        if (search_token) {
            params.searchToken = search_token;
        }
        if (!only_custom) {
            params.stockModel = 'all';
        }

        const data = await this._request('GET', '/character/listModels', params);

        const characters: CharacterModel[] = [];
        if (Array.isArray(data)) {
            data.forEach(char_data => {
                characters.push(CharacterModel.fromDict(char_data));
            });
        } else if (data.list) {
            data.list.forEach((char_data: any) => {
                characters.push(CharacterModel.fromDict(char_data));
            });
        }

        return characters;
    }

    async upload_character_model(
        source: string,
        name?: string,
        create_thumb: boolean = false
    ): Promise<string> {
        if (is_http_url(source)) {
            return await this._store_model(
                source,
                name || 'Unnamed Model',
                create_thumb
            );
        } else {
            if (!file_exists(source)) {
                throw new ValidationError(`Model file does not exist: ${source}`);
            }

            if (!name) {
                name = get_file_name_without_ext(source);
            }

            const model_ext = get_file_extension(source);

            const file_data = fs.readFileSync(source);
            const fileSize = file_data.length

            const params = {
                name,
                modelExt: model_ext,
                resumable: '0',
                fileSize
            };

            const {modelUrl} = await this._request('GET', '/character/getModelUploadUrl', params);

            const headers = {
                'Content-Length': fileSize,
                'Content-Type': 'application/octet-stream'
            };

            try {
                await axios.put(modelUrl, file_data, {
                    headers,
                    ...this._get_axios_config()
                });
            } catch (error: any) {
                if (isAxiosError(error)) {
                    throw new APIError(`Upload failed: ${error.message}`);
                }
                throw new APIError(`Upload failed: ${error.message}`);
            }


            return await this._store_model(
                modelUrl,
                name,
                create_thumb
            );
        }
    }

    private async _store_model(
        model_url: string,
        model_name: string,
        create_thumb: boolean = false,
        thumb_url?: string,
        model_id?: string
    ): Promise<string> {
        const store_data: Record<string, any> = {
            modelUrl: model_url,
            modelName: model_name
        };

        if (thumb_url) {
            store_data.thumbUrl = thumb_url;
        }
        if (model_id) {
            store_data.modelId = model_id;
        }
        if (create_thumb) {
            store_data.createThumb = 1;
        }

        const result = await this._request('POST', '/character/storeModel', undefined, store_data);
        return result.modelId;
    }

    async delete_character_model(model_id: string): Promise<number> {
        const data = await this._request('DELETE', `/character/deleteModel/${model_id}`);
        return data.count || 0;
    }

    async start_new_job(
        video_path: string,
        params?: ProcessParams,
        name?: string,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        const gcs_url = await this._upload_video(video_path, name);
        const rid = await this._process_video(gcs_url, undefined, undefined, params);

        if (blocking || progress_callback || result_callback) {
            if (blocking) {
                await this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                );
            } else {
                this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                ).catch(console.error);
            }
        }

        return rid;
    }

    async prepare_multi_person_job(
        video_path: string,
        name?: string,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        const gcs_url = await this._upload_video(video_path, name);
        const params = new ProcessParams();
        params.pipeline = 'mp_detection';
        const rid = await this._process_video(gcs_url, undefined, undefined, params);

        if (blocking || progress_callback || result_callback) {
            if (blocking) {
                await this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                );
            } else {
                this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                ).catch(console.error);
            }
        }

        return rid;
    }

    async start_multi_person_job(
        rid_mp_detection: string,
        models: Array<{ trackingId: string; modelId: string }>,
        params?: ProcessParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new ProcessParams();
        } else {
            params = params.copy();
        }

        params.models = models;
        const rid = await this._process_video(undefined, undefined, rid_mp_detection, params);

        if (progress_callback || result_callback) {
            if (blocking) {
                await this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                );
            } else {
                this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                ).catch(console.error);
            }
        }

        return rid;
    }

    async rerun_job(
        rid: string,
        params?: ProcessParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        const new_rid = await this._process_video(undefined, rid, undefined, params);

        if (blocking || progress_callback || result_callback) {
            if (blocking) {
                await this._poll_job(
                    new_rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                );
            } else {
                this._poll_job(
                    new_rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                ).catch(console.error);
            }
        }

        return new_rid;
    }

    private async _poll_job(
        rid: string,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        timeout?: number
    ): Promise<void> {
        const start_time = Date.now();

        while (true) {
            const job_status = await this.get_job_status(rid);

            if (job_status.status === Status.PROGRESS) {
                const step = job_status.details?.step || 0;
                const total = job_status.details?.total || 100;
                const percent = Math.ceil((step / total) * 100) || 0;
                const queue_pos = job_status.position_in_queue || 0;

                if (progress_callback) {
                    const data: ProgressCallbackData = {
                        rid,
                        progress_percent: percent,
                        position_in_queue: queue_pos
                    };
                    const result = progress_callback(data);
                    if (result instanceof Promise) {
                        await result;
                    }
                } else {
                    if (queue_pos) {
                        console.log(`Position in queue: ${queue_pos})`);
                    } else {
                        console.log(`Progress: ${percent}%`);
                    }
                }
            }

            if (job_status.status === Status.SUCCESS || job_status.status === Status.FAILURE) {
                if (!result_callback) {
                    if (job_status.status === Status.SUCCESS) {
                        console.log('Job completed successfully!');
                    } else {
                        console.log(`Job failed: ${job_status.details?.exc_message}`);
                    }
                } else {
                    let result_data: JobResult | undefined = undefined;
                    let error_data: JobError | undefined = undefined;

                    if (job_status.status === Status.SUCCESS) {
                        const inp = job_status.details?.input_file ? [job_status.details.input_file] : [];
                        const out = job_status.details?.output_file;
                        result_data = {input: inp as any, output: out as any};
                    } else {
                        const code = job_status.details?.exc_type || 'Unknown';
                        const msg = job_status.details?.exc_message || 'Unknown error';
                        error_data = {code, message: msg};
                    }

                    const data: ResultCallbackData = {
                        rid,
                        result: result_data,
                        error: error_data
                    };
                    const result = result_callback(data);
                    if (result instanceof Promise) {
                        await result;
                    }
                }
                return;
            }

            if (timeout && (Date.now() - start_time) / 1000 > timeout) {
                throw new TimeoutError(`Job timed out after ${timeout} seconds`, rid);
            }

            await new Promise(resolve => setTimeout(resolve, poll_interval * 1000));
        }
    }

    async get_job_status(rid: string): Promise<JobStatus> {
        const data = await this._request('GET', `/status/${rid}`);

        if (data.count > 0 && data.status) {
            const status_data = data.status[0];
            return JobStatus.fromDict(status_data);
        }

        return {
            rid,
            status: Status.PROGRESS
        };
    }

    async list_jobs(status?: Status[]): Promise<Job[]> {
        let path: string;
        if (status) {
            const status_str = status.join(',');
            path = `/list/${status_str}`;
        } else {
            path = '/list';
        }

        const data = await this._request('GET', path);

        const jobs: Job[] = [];
        if (data.list) {
            data.list.forEach((job_data: any) => {
                jobs.push(Job.fromDict(job_data));
            });
        }

        return jobs;
    }

    async download_job(rid: string, output_dir?: string): Promise<DownloadLink> {
        const data = await this._request('GET', `/download/${rid}`);

        if (data.count === 0) {
            throw new APIError(`No download links found for rid ${rid}`);
        }

        const link_data = data.links[0];
        const download_link = DownloadLink.fromDict(link_data);

        if (output_dir) {
            await this._download_files(download_link, output_dir);
        }

        return download_link;
    }

    private async _download_files(download_link: DownloadLink, output_dir: string): Promise<number> {
        const output_dir_with_rid = path.join(output_dir, download_link.rid);
        ensure_directory_exists(output_dir_with_rid);

        let count = 0;
        for (const url_group of download_link.urls) {
            const name = url_group.name;

            if (ends_with_mp_tracked_id(name) || name.startsWith('inter')) {
                continue;
            }

            for (const file_info of url_group.files) {
                const file_type = file_info.file_type;
                const file_url = file_info.url;

                let output_file: string;
                if (name === 'all_characters') {
                    output_file = path.join(output_dir_with_rid, `${name}.${file_type}.zip`);
                } else if (file_type === 'mp4') {
                    output_file = path.join(output_dir_with_rid, `${name}.${file_type}`);
                } else {
                    output_file = path.join(output_dir_with_rid, `${name}.${file_type}`);
                }

                try {
                    const response: any = await axios.get(file_url, {
                        responseType: 'arraybuffer',
                        validateStatus: (status: number) => status < 500,
                        ...this._get_axios_config()
                    });

                    if (response.status >= 400) {
                        throw new APIError(`Download failed with status ${response.status}`);
                    }

                    fs.writeFileSync(output_file, Buffer.from(response.data));
                    count++;
                } catch (error: any) {
                    if (isAxiosError(error)) {
                        throw new APIError(`Download failed: ${error.message}`);
                    }
                    throw new APIError(`Download failed: ${error.message}`);
                }
            }
        }

        console.log(`Downloaded ${count} files to ${output_dir_with_rid}`);
        return count;
    }

    async get_credit_balance(): Promise<number> {
        const data = await this._request('GET', '/account/creditBalance');
        return Math.floor(data.credits || 0);
    }

    async close(): Promise<void> {
        this._httpAgent.destroy();
        this._httpsAgent.destroy();
    }
}

export {Animate3DClient as AsyncAnimate3DClient};
