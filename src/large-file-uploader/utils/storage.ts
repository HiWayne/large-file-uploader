import Dexie, { Table } from "dexie";

export interface FileDoc {
  id?: number;
  file: File;
  chunks: Blob[];
  result:
    | "completed"
    | "failure"
    | "uploading"
    | "initialization"
    | "suspended"
    | "cancel";
  start: number;
  end: number;
  customParams?: any;
  spaceName: string;
}

export class FileCacheDB extends Dexie {
  // 'friends' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  files!: Table<FileDoc>;

  constructor() {
    super("fileDataBase");
    this.version(2).stores({
      files: "++id, spaceName", // Primary key and indexed props
    });
  }
}

export const db = new FileCacheDB();
