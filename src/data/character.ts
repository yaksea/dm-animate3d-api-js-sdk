export interface CharacterModel {
  id: string;
  name: string;
  thumb?: string;
  rigId?: string;
  ctime?: number;
  mtime?: number;
  platform?: string;
}

export namespace CharacterModel {
  export function fromDict(data: any): CharacterModel {
    return {
      id: data.Id || data.id,
      name: data.name,
      thumb: data.thumb || data.thumbnail,
      rigId: data.rigId,
      ctime: data.ctime,
      mtime: data.mtime,
      platform: data.platform
    };
  }
}