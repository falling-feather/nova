# 第九章 · 四季问询亭

桌面端实时三维学习场景。安装、构建和启动方式见[项目根 README](../../README.md)，整站文档见[文档入口](../../docs/README.md)。本章教学仍围绕参数记忆、上下文和检索增强，界面与场景改造不改写问答数据、学习判定或存档协议。

## 当前呈现（2026-10-28）

- 场景：木构温室、实体石材铺装、记忆之书展架、资料抽屉、水庭和成组植物。独立 Blender 道具包含吊篮、灯具、园艺壶、书册、标本盒和写字用具；保留可编辑建模源文件。
- 渲染：按第一章的暖色高光、冷色阴影和色调映射校准晴天，减轻中景灰雾；材质分别使用颜色、粗糙度和法线信息。环境探针采样实际温室，水池使用平面倒影；第五天小雨与课程日历对应。减少动态和省电模式继续有效。
- UI：参考[第一章控件样式](../01/src/ui/style.css)与实机界面，采用奶油色胶囊按钮、绿色选中态、角色头像、圆头线图标、按下深度和黄色键盘焦点。返回入口单独外露；弹窗期间与顶栏、工作站一起变灰并不可操作。
- 操作：五个工作站显示简短概念说明；阅读面板可以收起和展开，草稿与分页保留。新增陈列家具的碰撞边界从实际模型计算，进入全景后的缩放和返回镜头连续。

## 实现入口

| 部分 | 权威文件 |
| --- | --- |
| 界面外观、图标和交互状态 | [conservatory.css](src/ui/conservatory.css)、[html.ts](src/ui/html.ts)、[app.ts](src/ui/app.ts) |
| 建筑、铺装、教具及陈列 | [architecture.ts](src/scene/architecture.ts)、[floor.ts](src/scene/floor.ts)、[exhibits.ts](src/scene/exhibits.ts)、[dressing.ts](src/scene/dressing.ts) |
| 庭院、植物与天气 | [garden.ts](src/scene/garden.ts)、[botanical.ts](src/scene/botanical.ts)、[trees.ts](src/scene/trees.ts)、[atmosphere.ts](src/scene/atmosphere.ts) |
| 材质、光照、倒影与接触阴影 | [materials.ts](src/scene/materials.ts)、[presentation.ts](src/scene/presentation.ts)、[water.ts](src/scene/water.ts)、[illustration.ts](src/scene/illustration.ts)、[world.ts](src/scene/world.ts) |
| 模型源与导入 | [Blender 生成脚本](tools/build-conservatory-props.py)、[可编辑模型工程](tools/conservatory-props.blend)、[props.ts](src/scene/props.ts) |
| 空间和镜头 | [plan.json](src/spatial/plan.json)、[navigation.ts](src/scene/navigation.ts) |

植物按空间分组绘制。微小花叶避免重复参与阴影和法线通道；接触阴影在相机静止时复用，镜头变化时立即更新。轮廓和接触阴影共用缓冲，反射与主画面共用阴影图。这些是实现策略，不能代替实际设备的帧率结论。

渲染依据：[Three.js 色彩管理](https://threejs.org/manual/pages/color-management.html)、[标准材质](https://threejs.org/docs/pages/MeshStandardMaterial.html)、[GTAO](https://threejs.org/docs/pages/GTAOPass.html)、[平面反射](https://threejs.org/docs/pages/Reflector.html)。模型和素材来源见[素材记录](public/art/provenance.json)及[Blender 道具记录](public/art/models/provenance.json)。

## 整站集成与验证

用户截图中的53633入口来自第八章分支预览，其他章节此前回落到旧展示包，导致第九章一直显示白色通栏和旧石质台面。2026-10-28已将本章当前构建同步到“整站-纯前端展示/site/chapters/09”，补齐整站存储与返回脚本。独立预览和整站入口现在使用同一份第九章构建；只更新本章，没有重新打包整站 ZIP。

构建和41项测试通过。实际Edge窗口验证工作站、资料页、选中与悬停状态、弹窗聚焦变灰、返回入口和单屏布局；修正了选中按钮悬停时变浅、与白字对比不足的问题。截图位于项目根 `tmp/ch09-ui-20261028/`，复用整站同步脚本为该目录内的 `sync-preview.cjs`，须用随包Node 24.20.0运行。

未扩展多尺寸或完整25环节的浏览器穷举。此前帧率采样存在任务窗口和前后台状态干扰，不能据此声明稳定帧率已验收。DEV-025仍待用户审阅整体美术与体验；任务状态以项目02文档为准。
