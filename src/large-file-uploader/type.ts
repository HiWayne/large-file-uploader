export interface ProgressData {
  status:
    | "completed"
    | "failure"
    | "uploading"
    | "initialization"
    | "suspended"
    | "cancel"
    | "waiting";
  progress: number;
  file: File;
  isCache?: boolean;
}

export interface ControllerData {
  pause: () => void;
  resume: () => void;
  remove: () => void;
  _setUploader?: boolean;
}

export type UploaderData = ProgressData & ControllerData & { file: File };
