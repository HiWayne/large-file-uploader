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
[license-url]: https://github.com/HiWayne/large-file-uploader/blob/master/LICENSE

</div>

## Feature

- 断点续传，不必重头再来
- 支持二次秒传功能
- 基于 indexedDB 的离线缓存，断网也能恢复进度
- 多线程计算，面对大文件处理更快
- 只提供下载队列的状态数据，你可以自由定制 UI
- 丰富的配置，你可以限制文件类型、每个切片大小、线程数、请求并发数、是否开启离线缓存等

## Demo

[在线体验](https://hiwayne.github.io/large-file-uploader/site/?demo)

在线体验的代码实现在[这里](https://github.com/HiWayne/large-file-uploader/blob/master/src/pages/Demo.tsx)

## Getting Started

```ts
import createUploader, type { UploaderData } from "large-file-uploader";

const uploader = createUploader<number>({
    // upload中定义上传逻辑，它是createUploader唯一必须的配置，每次分片上传都会调用它
    // 这里举了一个分片上传例子，后端利用id知道分片属于哪个文件
    async upload({ chunks, start, end, size, hashSum }, customParams) {
        // type will is number
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
    gotCache: (cacheList: UploaderData[], uploadDataList: UploaderData[]) {
        // 在开启离线缓存的情况下，这个回调可以拿到上次未传完的离线文件缓存队列（cacheList）和 总上传队列（uploadDataList）
    },
    update(uploadDataList: UploaderData[]) {
        // 这里可以收到上传列表状态的更新（包括进度、队列增删等变化），包括离线缓存队列
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
    status: "completed" | "failure" | "uploading" | "initialization" | "suspended" | "cancel" | "waiting"; // 上传状态
    progress: number; // 当前上传进度 0~1
    total: number; // 切片总数
    file: File; // 原文件
    result: any; // 上传完成后的后端返回结果
    createTimestamp: number; // 上传项创建时间
    isCache?: boolean; // 是否是缓存
    pause: () => void; // 暂停
    resume: () => void; // 继续
    remove: () => void; // 删除
    update: (data: Partial<UploaderData>) => void; // 手动更新该项目的状态
  }
*/
```

**拿到上述代码的 `uploader` 后，调用 `uploader.uploadFile`，它会调起文件选择器。选择完文件后自动开始上传（你也可以使用 immediately: false 配置，这时仅仅将文件设为暂停状态放入队列中，由用户决定何时开始上传，更多配置请查阅 api 文档）**

**由于本库只关心状态数据，如果你想做文件拖拽上传，你需要自己完成拖拽 UI 交互。在你拿到文件后，你可以使用 `uploader.giveFilesToUpload(files: FileList | File[])` 上传**

上传队列中所有文件项对应上述代码中的 `uploadDataList: UploaderData[]` 数组。里面包含每个上传项各自的暂停、恢复、移除、更新操作，分别是 `uploadDataItem: UploaderData` 里的 `pause`、`resume`、`remove`、`update`方法。其中`update`方法，用来更新该项的各种状态属性（即`UploaderData`类型），正常情况下不需要使用，因为已经由库帮你管理了。只有两种情况需要：

1. 你关闭了切片功能，因此 chunks 数组里只有一个完整的文件: file，相当于只有 1 个切片，由于 upload 请求完全交给了开发者做，库本身是不知道单个切片内部的上传进度的，这时开发者就可以使用`update({ progress: number })`手动更新进度。

2. 你不满足于以切片为粒度显示进度，你需要精确到单个切片内部的上传进度（因为库无法知道开发者自定义的 upload 内部的事情），这时你可以使用 update 手动更新。（比如文件上传当前进度 progress 是 0.5，切片总数 total 是 10，upload 内部获知正在上传的切片已经上传到 50%。因此，文件上传进度 progress 应该更新到 0.5 + 1 / 10 × 50%，即 update({ progress: 0.55 })）

## Api Document

[完整文档](https://hiwayne.github.io/large-file-uploader/site/?api)

## Tip

离线缓存功能如果开启，上传过程中可能会大量占用你的硬盘空间（视上传的文件大小而定），在上传完成或者取消上传后会被自动删除。另外，大文件在 indexedDB 的离线储存和离线更新，在某些浏览器下响应可能较慢（并不会阻塞 UI），可能存在读取/更新不及时的现象（例如，实际上传进度已经到 50%，缓存只记录到 40%）。在 Chrome 中容易出现，在 Firefox 中表现较好。因此离线缓存功能 `offlineStorage: boolean` 是默认关闭的，如果你的场景很少有大文件或者你可以接受可能发生的离线数据更新不及时，则可以打开。
