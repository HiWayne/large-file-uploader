export interface ProgressData {
  result:
    | "completed"
    | "failure"
    | "uploading"
    | "initialization"
    | "suspended"
    | "cancel";
  progress: number;
}

export interface ControllerData {
  pause: () => void;
  resume: () => void;
  remove: () => void;
  _setUploader?: boolean;
}

export type UploaderData = ProgressData & ControllerData & { file: File };
