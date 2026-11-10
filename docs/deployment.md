# 构建与部署

奇点的发布产物是纯静态网站。十三章的模型和运行素材随站点提供，学习计算与记录在浏览器中完成，无需数据库、登录服务或在线模型 API。

[返回项目首页](../README.md) · [在线体验](https://falling-feather.github.io/nova/)

## 本地构建与预览

准备 Git、Node.js **24.20.0 或更新版本**和 npm。源码首次安装与整站构建：

```bash
git clone --branch main --single-branch https://github.com/falling-feather/nova.git
cd nova
npm ci
npm run build:site
npm start
```

默认访问 `http://127.0.0.1:4173/`，按 `Ctrl+C` 关闭。预览服务只监听本机；局域网展示使用下文的独立包启动器。

`npm run build:site` 先构建主站和十三章，再组装 `dist-site/`。不要直接编辑该生成目录。修改单章后，也可以只构建受影响内容，再组装：

```bash
npm run build -- 08
node tools/build-site.cjs
npm start
```

这一做法要求其他章节已完成一次构建。全部脚本以 [package.json](../package.json) 为准。

修改原始插图后，先运行 `npm run assets:optimize` 更新网页图片，再构建站点。首次克隆已包含所需网页版本，具体范围见[图片交付说明](image-delivery.md)。

## 静态服务器

1. 运行 `npm ci` 和 `npm run build:site`。
2. 将 **`dist-site/` 内的全部内容**上传到站点根目录或固定子目录，例如 `/nova/`。保持文件夹层级与大小写。
3. 配置目录入口为 `index.html`，以 HTTP 或 HTTPS 访问。
4. 打开首页、课程目录和某一章节，确认模型文件能正常加载，再部署到展示环境。

```text
dist-site/
├── index.html           首页
├── courses/             课程目录
├── chapters/01 … 13/    章节与模型资源
├── personal/            本机学习记录
├── platform/            共享存档客户端
├── licenses/            第三方许可
└── .nojekyll            GitHub Pages 静态发布标记
```

服务器应正确返回 JavaScript、图片、字体和视频；`.wasm` 使用 `application/wasm`，`.onnx` 可使用 `application/octet-stream`。这是多页面站点，不要把所有资源请求都改写到首页。课程的相对链接支持根目录与 `/nova/` 这样的项目路径。

## GitHub Pages

本仓库使用 **`main` 源码 + `gh-pages` 构建产物**的分支发布方式。[打开现有在线站点](https://falling-feather.github.io/nova/)。

### 首次部署到自己的仓库

1. Fork 或建立自己的源码仓库，并克隆到本地；确认 `git remote -v` 中的 `origin` 指向要发布的仓库。
2. 完成 Git 的作者配置与 GitHub 身份认证，并确认拥有目标仓库的推送权限。
3. 在源码根目录构建并发布：

```bash
npm ci
npm run build:site
npx gh-pages@6.3.0 -d dist-site --dotfiles
```

`gh-pages` 是按需调用的发布工具，不是网站运行依赖。它把 `dist-site/` 的内容同步至远端 `gh-pages` 分支，包含 `.nojekyll`，并移除该发布分支中已不在产物里的旧文件。源码仍留在 `main`。如使用自定义域名，发布前将对应的 `CNAME` 文件放入本次产物。

4. 打开仓库 **Settings → Pages → Build and deployment**，设置：

| 配置项 | 值 |
| --- | --- |
| Source | Deploy from a branch |
| Branch | `gh-pages` |
| Folder | `/ (root)` |

5. 保存后，在 **Actions** 中查看 `pages build and deployment`。任务成功后，使用 Pages 设置页显示的网址访问。

配置规则见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)，发布参数见 [gh-pages 工具文档](https://github.com/tschaub/gh-pages)。

### 后续更新

先提交需要发布的源码修改，再运行：

```bash
npm run build:site
npx gh-pages@6.3.0 -d dist-site --dotfiles
```

仅推送 `main` 不会触发本项目的整站构建。只修改 README 或文档图片时，提交 `main` 即可。当前仓库没有配置从源码自动构建部署的工作流。

## Windows 独立运行包

适合展示电脑或局域网：完整解压后双击 **“点我一键启动.cmd”**，无需另装 Node 或 npm。

### 从源码导出

在 Windows x64 上，以 Node.js 24.20+ 执行以下命令。输出目录必须尚不存在，父目录必须已存在，并位于当前项目工作区内：

```powershell
npm ci
npm run build
node tools/export-frontend.cjs ../nova-windows
```

导出器默认使用当前 Node 可执行文件及其同目录的 `LICENSE` 或 `LICENSE-Node.txt`。如使用版本管理器且运行时目录没有许可证，将官方 Windows x64 Node 分发包完整解压，再指定：

```powershell
$env:NOVA_RUNTIME_NODE = 'C:/tools/node-v24.20.0-win-x64/node.exe'
node tools/export-frontend.cjs ../nova-windows
```

这里的路径需替换为自己实际解压的位置。已有输出目录不会被覆盖；导出成功后，将整个 `nova-windows/` 文件夹交付或压缩，保留以下内容：

```text
nova-windows/
├── 点我一键启动.cmd
├── README.md
├── release.json
├── site/                完整静态网站
├── tools/               静态服务与启动器
├── runtime/             Node 与许可证
└── licenses/            第三方许可
```

### 启动与局域网访问

- **本机**：双击 `点我一键启动.cmd`，浏览器会打开实际可用地址。保留启动窗口，关闭窗口或按 `Ctrl+C` 停止服务。不要在压缩软件中直接运行。
- **局域网**：先关闭原启动窗口，在运行包目录的终端执行 `runtime/node.exe tools/static-start.cjs --lan`。同网络设备使用展示电脑的局域网 IP 与终端显示的端口访问；防火墙需允许该端口。
- **记录**：每个浏览器保存自己的进度，不进行多人实时同步。启动器优先使用 55887 端口，被占用时选择可用端口。

## 常见问题

| 现象 | 检查方式 |
| --- | --- |
| Node 版本被拒绝 | 执行 `node -v`，确认实际使用的是 24.20.0 或更新版本 |
| 打开后只有空白、模型加载失败 | 使用 HTTP 服务；确认模型、WASM 等文件随站点一起上传，且没有被重写为首页 HTML |
| 3D 场景卡顿 | 开启浏览器硬件加速，并在提供画质选项的章节降低画质 |
| 改了源码，线上没变化 | 重新构建、发布 `gh-pages`，确认 Pages 任务成功；仅提交 `main` 不会更新网站 |
| 换网址后学习记录不见了 | 浏览器按域名和端口分开存储。回到原地址导出作品，再在新地址导入 |
| Windows 导出提示许可证缺失 | 使用包含官方许可证的完整 Node 分发包，并设置 `NOVA_RUNTIME_NODE` |

构建入口：[整站组装](../tools/static-site.cjs) · [静态构建](../tools/build-site.cjs) · [Windows 导出](../tools/export-frontend.cjs)。
