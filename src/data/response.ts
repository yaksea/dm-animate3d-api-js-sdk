export interface FileInfo {
  file_type: string;
  url: string;
}

export interface UrlGroup {
  name: string;
  files: FileInfo[];
}

export interface DownloadLink {
  rid: string;
  name?: string;
  size?: number;
  duration?: number;
  input_url?: string;
  urls: UrlGroup[];
  mode?: number;
  models?: any[];
}

export namespace DownloadLink {
  export function fromDict(data: any): DownloadLink {
    return {
      rid: data.rid,
      name: data.name,
      size: data.size,
      duration: data.duration,
      input_url: data.input,
      mode: data.mode,
      models: data.models,
      urls: data.urls.map((group: any) => ({
        name: group.name,
        files: group.files.map((file: any) => {
          const file_type = Object.keys(file)[0];
          const url = file[file_type];
          return { file_type, url };
        })
      }))
    };
  }
}