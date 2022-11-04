import path from "path";
import rimraf from "rimraf";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { default as babelPlugin } from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";
import dts from "rollup-plugin-dts";

rimraf.sync("./dist");
rimraf.sync("./es");
rimraf.sync("./lib");

const babel = babelPlugin({
  presets: [
    ["@babel/preset-typescript", { allowDeclareFields: true }],
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: ["> 1%", "last 2 versions", "not ie <= 8"],
        },
        modules: false,
      },
    ],
  ],
  plugins: ["@babel/plugin-transform-runtime"],
  exclude: "node_modules/**",
  babelHelpers: "runtime",
  // babel 默认不支持 ts 需要手动添加
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});

export default [
  {
    input: "./src/large-file-uploader/index.ts",
    output: [
      {
        file: "./es/index.js",
        format: "esm",
      },
      {
        file: "./lib/index.js",
        format: "commonjs",
        exports: "default",
      },
    ],
    plugins: [
      nodeResolve({
        nodeResolve: "node",
        mainField: ["jsnext:main", "browser", "module", "main"],
        extensions: [".js", ".es6", ".es", ".mjs", ".jsx", ".ts", ".tsx"],
      }),
      commonjs(),
      babel,
    ],
  },
  {
    input: "./src/large-file-uploader/index.ts",
    output: [
      {
        file: "./dist/index.js",
        format: "umd",
        exports: "default",
        name: "createFileUploader",
      },
    ],
    plugins: [
      nodeResolve({
        nodeResolve: "node",
        mainField: ["jsnext:main", "browser", "module", "main"],
        extensions: [".js", ".es6", ".es", ".mjs", ".jsx", ".ts", ".tsx"],
      }),
      commonjs(),
      babel,
    ],
  },
  {
    input: "./src/large-file-uploader/index.ts",
    output: [
      {
        file: "./dist/index.min.js",
        format: "umd",
        compact: true,
        sourcemap: true,
        exports: "default",
        name: "createFileUploader",
      },
    ],
    plugins: [
      nodeResolve({
        nodeResolve: "node",
        mainField: ["jsnext:main", "browser", "module", "main"],
        extensions: [".js", ".es6", ".es", ".mjs", ".jsx", ".ts", ".tsx"],
      }),
      commonjs(),
      babel,
      terser(),
    ],
  },
  {
    input: "./src/large-file-uploader/index.ts",
    output: [
      {
        file: "./es/index.d.ts",
        format: "esm",
      },
    ],
    plugins: [
      nodeResolve({
        nodeResolve: "node",
        mainField: ["jsnext:main", "browser", "module", "main"],
        extensions: [".js", ".es6", ".es", ".mjs", ".jsx", ".ts", ".tsx"],
      }),
      commonjs(),
      dts(),
    ],
  },
];
