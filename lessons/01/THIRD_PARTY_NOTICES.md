# 依赖与素材来源

本项目运行时使用本地文件，不依赖 CDN；以下是实际素材与实现来源。

| 资源 | 来源与许可 | 本项目用途 |
| --- | --- | --- |
| Three.js r186 | 工作区本地引擎，MIT 全文见 [THREE-LICENSE.txt](src/vendor/THREE-LICENSE.txt) | 三维渲染；npm 的同版本 addons 通过构建 alias 复用本地引擎 |
| Vite、Prettier、Playwright | 固定版本见整站根目录 [package-lock.json](../../package-lock.json)，许可保留在各包内 | 构建、格式化、隔离浏览器验证，非远程运行依赖 |
| grass_ground，Charlotte Baglioni | [Poly Haven 原页](https://polyhaven.com/a/grass_ground)，[CC0](https://polyhaven.com/license) | 草地 Diffuse、OpenGL normal 两张原图 |
| Camera 01，Rajil Jose Macatangay | [模型原页](https://polyhaven.com/a/Camera_01)，CC0-1.0 | 照相馆柜台的复古相机；保留原始1K贴图，镜片采用不触发整场透射的镀膜材质 |
| Croissant，Dario Barresi / Greg Zaal | [模型原页](https://polyhaven.com/a/croissant)，CC0-1.0 | 面包房固定陈列的可颂 |
| honey-oak.png、warm-limestone.png、ivory-plaster.png、bread-crust.png、naturalist-prints.png、meadow-atlas.png、photographers-prints.png、tree-foliage.png、slate-cleft.png、linen-cotton.png、fine-leather.png | 本轮内置 imagegen 生成；[完整提示及哈希](assets/art/provenance.json) | 木作、石材、灰泥、课程面包烘烤表皮、自然/摄影装饰画、透明花簇与枝叶、板岩、织物与皮革表面 |
| spring-horizon.png | 本轮使用内置 imagegen 生成，见 [生成记录](assets/environment/provenance.json) | 不可到达的远山森林背景；非全镇或房屋贴图 |
| 手写数字样本 | Alpaydin, E. & Kaynak, C. (1998), UCI Optical Recognition of Handwritten Digits，DOI 10.24432/C50P49，[数据页](https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 沿用原型的裁剪、16×16 归一化、筛选与序列化参数；作者不为课程背书 |
| 线描、旋律统计、合成鸟声和教学音频 | 用户提供的 HTML 原型与工作区旧版；数据在 [src/content](src/content/) | 有限本地教学模型，没有接入外部通用 AI 服务 |
| 原设计文档及原型 | 用户提供，原件及哈希在 [references](references/) | 课程与空间设计参考；DOCX 三图原样提取到 doc/image |
| 全景与游玩参考图 | 前一阶段用户已认可的生成概念，原始图与提示保存在 concepts-20260928（历史来源，不在本包） | 本轮美术参考，未作为真实运行截图展示 |
| 其余建筑、角色、植物、道路、教具及 UI | 本轮在项目内程序化建模和绘制 | 可交互实体，无下载的第三方角色或建筑模型 |

原始 PBR 文件未进行图片编辑，使用时由渲染材质控制重复、法线与颜色。逐文件 URL、作者、字节数与 SHA256 在 [assets/pbr/sources.json](assets/pbr/sources.json)；恢复源文件的唯一工具为 [fetch-materials.cjs](tools/fetch-materials.cjs)，下载后核对供应方摘要。旧石砖、木作和灰泥 PBR 已被当前专用材质替换，并从运行素材移除；草地 PBR 保留。

两份外部道具经用户确认接入，完整原始文件清单、下载地址、供应方MD5及本地SHA256见 [模型资源锁](assets/models/asset-lock.json)。因本机无game-dev工具，采用用户批准的手动来源、闭合依赖清单、复制后哈希和真实浏览器验收。构建使用Three官方GLTFLoader读取本地模型并归一化尺寸，不修改原始贴图；模型几何和材质参数由 [import-prop-assets.cjs](tools/import-prop-assets.cjs) 生成，运行时不请求供应方。

上述生成材质与小镇远景均保存 imagegen 原始 PNG，未裁切或后期修改；运行时使用远景圆柱与边缘透明渐变。正式课程视频没有提供；技术测试色卡只在 .work 中，未进入发布资源。




摄影图集中的街景、黑白风车、花卉和池岸均为生成的装饰作品，不是学生照片或历史影像。树冠与盆花使用原始透明图集，通过有曲度的固定三维卡片与实体枝干组合。

角色是本项目原创的程序化黏土玩偶，加载时由有向距离场生成，表情图集由程序绘制，遮蔽由同一距离场计算；未引入外部人物模型或贴图。

照相馆与面包房的固定陈设遮蔽图由同一本机Blender以CPU Cycles烘焙；[assets/shading/rooms](assets/shading/rooms/)逐房保存源几何签名、参数、UV映射与文件哈希。模型仍来自本项目程序网格，未引入外部室内模型或烘焙日光。
