# Large File Uploader

专为上传功能而优化

## 特点

- 断点续传，不必重头再来
- 基于 indexedDB 的离线缓存，离线也能恢复进度
- 多线程计算，面对大文件处理更快
- 只提供状态数据，你可以自由定制 UI
- 丰富的选项配置，你可以限制文件类型、每个切片大小、线程数、请求并发数、是否开启缓存等

## Getting Started

```ts
import createFileUploader, type { UploaderData } from "large-file-uploader";

const uploader = createFileUploader({
    // 这里定义上传逻辑，是createFileUploader唯一的必须参数
    async upload({ chunks, start, end, size, hashSum }, customParams: number) {
        // 假设后端可能需要一个id来记住上传的文件，所以一开始先申请一个id
        let id = customParams;
        // 没有customParams代表第一次调用
        if (customParams === undefined) {
            id = await applyUploadId();
        }
        await uploadChunks({ id, chunks, start, end, size });
        // return的数据会作为下一次的customParams，这样该文件每次upload分片都可以带上你需要的customParams
        return id;

        // 也可能你是通过文件hash来和后端确认文件的，那直接使用hashSum参数就可以了，hashSum是该文件所有分片hash的和
    },
    init(uploadDataList: UploaderData[]) {
        // 这个回调触发之后才可以使用uploader.uploadFile()
    },
    handleProcess(uploadDataList: UploaderData[]) {
        // 这里可以收到上传列表状态的更新（包括进度、队列增删等变化）
    },
    success() {
        // 上传全部成功后
    },
    error(uploadDataList: UploaderData[]) {
        // 发生错误时
    },
});

/* UploaderData:
  {
    result: "completed" | "failure" | "uploading" | "initialization" | "suspended" | "cancel" | "waiting"; // 上传状态
    progress: number; // 当前上传进度 0~1
    file: File; // 原文件
    isCache?: boolean; // 是否是缓存
    pause: () => void; // 暂停
    resume: () => void; // 继续
    remove: () => void; // 删除
  }
*/
```

拿到 `uploader` 后调用 `uploader.uploadFile`，会调起文件选择框，然后上传

上传队列中所有项目对应 `uploadDataList: UploaderData[]` 数组, ，每个上传项目各自的暂停、恢复、移除操作，是 `uploadDataItem: UploaderData` 里的 `pause`、`resume`、`remove`方法
