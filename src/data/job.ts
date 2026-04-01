import { Status } from './enums';

export interface Job {
  rid: string;
  status: Status;
  created_at: string;
  updated_at: string;
  name?: string;
}

export namespace Job {
  export function fromDict(data: any): Job {
    return {
      rid: data.rid,
      status: data.status as Status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      name: data.name
    };
  }
}