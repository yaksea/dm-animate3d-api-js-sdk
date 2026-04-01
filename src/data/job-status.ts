import { Status } from './enums';

export interface JobDetails {
  step?: number;
  total?: number;
  input_file?: string | string[];
  output_file?: string | string[];
  exc_type?: string;
  exc_message?: string;
}

export interface JobStatus {
  rid: string;
  status: Status;
  details?: JobDetails;
  position_in_queue?: number;
}

export namespace JobStatus {
  export function fromDict(data: any): JobStatus {
    const details = data.details ? {
      step: data.details.step,
      total: data.details.total,
      exc_type: data.details.exc_type,
      exc_message: data.details.exc_message,
      input_file: data.details.in,
      output_file: data.details.out
    } : undefined;

    return {
      rid: data.rid,
      status: data.status as Status,
      details,
      position_in_queue: data.position_in_queue || data.positionInQueue
    };
  }
}