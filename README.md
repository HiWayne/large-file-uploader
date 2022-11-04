<h1 align="center">Large File Uploader</h1>

<div align="center">

专为上传功能而优化

[![GITHUB][github-image]][github-url] [![NPM version][npm-image]][npm-url] [![][bundlesize-js-image]][unpkg-js-url] [![LICENSE][license-image]][license-url]

[npm-image]: http://img.shields.io/npm/v/large-file-uploader.svg?style=flat-square
[npm-url]: http://npmjs.org/package/large-file-uploader
[download-image]: https://img.shields.io/npm/dm/large-file-uploader.svg?style=flat-square
[download-url]: https://npmjs.org/package/large-file-uploader
[bundlesize-js-image]: https://img.badgesize.io/https:/unpkg.com/large-file-uploader/dist/index.min.js?label=gzip+umd+size&compression=gzip&style=flat-square
[unpkg-js-url]: https://unpkg.com/browse/large-file-uploader/dist/index.min.js
[github-image]: https://img.shields.io/badge/GitHub-star-yellow.svg?style=social&logo=github
[github-url]: https://github.com/HiWayne/large-file-uploader
[license-image]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://github.com/HiWayne/large-file-uploader/LICENSE

</div>

## 特点

- 断点续传，不必重头再来
- 支持秒传功能
- 基于 indexedDB 的文件缓存，离线也能恢复进度
- 多线程计算，面对大文件处理更快
- 只提供下载队列的状态数据，你可以自由定制 UI
- 丰富的配置，你可以限制文件类型、每个切片大小、线程数、请求并发数、是否开启离线缓存等

## Getting Started

```ts
import createFileUploader, type { UploaderData } from "large-file-uploader";

const uploader = createFileUploader({
    // upload中定义上传逻辑，它是createFileUploader唯一必须的配置，每次分片上传都会调用它
    // 这里举了一个分片上传例子，后端利用id知道分片属于哪个文件
    async upload({ chunks, start, end, size, hashSum }, customParams: number) {
        let id = customParams;
        // 没有customParams代表第一次调用
        if (id === undefined) {
            // 假设后端可能需要一个id来记住上传的文件，所以一开始先申请一个id
            id = await applyUploadId();
        }
        // 上传某个分片
        const response = await uploadChunk({ id, chunks, start, end, size });
        // 假设如果有response.end代表文件传完了
        if (response.end) {
            // 文件上传完成时的返回值会交给 UploaderData 中的result，里面可能有你需要的cdn地址等信息
            return response.data
        } else {
            // 上传过程中，return的数据会作为下一次的customParams，这样该文件每次upload分片都可以带上你需要的customParams（如本例的id）
            return id;
        }
        // 这里只是举例，也可能你是通过文件hash来和后端确认文件标识的，那直接使用hashSum参数就可以了，hashSum是该文件所有分片hash的和
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
    checkHash(hash: string) {
        // 如果返回true，则可以秒传
    }
});

/* UploaderData:
  {
    result: "completed" | "failure" | "uploading" | "initialization" | "suspended" | "cancel" | "waiting"; // 上传状态
    progress: number; // 当前上传进度 0~1
    file: File; // 原文件
    result: any; // 上传完成后的后端返回结果
    isCache?: boolean; // 是否是缓存
    pause: () => void; // 暂停
    resume: () => void; // 继续
    remove: () => void; // 删除
  }
*/
```

拿到上述代码的 `uploader` 后，调用 `uploader.uploadFile`，它会调起文件选择器。选择完文件后自动开始上传（你也可以使用 immediately: false 配置，这时仅仅将文件设为暂停状态放入队列中，由用户决定何时开始上传）

上传队列中所有文件项对应 `uploadDataList: UploaderData[]` 数组, 里面包含每个上传项各自的暂停、恢复、移除操作，分别是 `uploadDataItem: UploaderData` 里的 `pause`、`resume`、`remove`方法
