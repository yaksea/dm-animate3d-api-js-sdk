export interface ProgressCallbackData {
  rid: string;
  progress_percent: number;
  position_in_queue: number;
}

export interface JobResult {
  input: string[];
  output: any;
}

export interface JobError {
  code: string;
  message: string;
}

export interface ResultCallbackData {
  rid: string;
  result?: JobResult;
  error?: JobError;
}

export type ProgressCallback = (data: ProgressCallbackData) => void | Promise<void>;
export type ResultCallback = (data: ResultCallbackData) => void | Promise<void>;