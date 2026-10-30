# 提交版浏览器验收

在项目根运行。使用根目录的Playwright依赖和已安装的桌面Edge，测试创建隔离浏览器上下文，不使用个人浏览器档案。

```powershell
npm run test:browser          # 十三章：1366×768、1440×900的入口、工作区、真实返回
npm run test:account          # 第8章：注册、画作保存、目录续学、另一浏览器登录恢复
node tools/qa.cjs neural      # 第6/11章：训练、A/B、解释、封存、导出与刷新
node tools/qa.cjs sand        # 第8章：真实画笔、ONNX、采样与25活动布局
node tools/qa.cjs space       # 第9章：资料进入上下文、核对、交班与刷新
node tools/qa.cjs foundations # 第1章：地图、移动、拍照与识图面板
node tools/qa.cjs platform    # 账号隔离、旧标签、冲突、离线重连等边界
```

这些命令先确认本项目构建完整，再启动空闲本机端口和内存账号库。环境变量只传给测试子进程；结束时关闭服务器。正式`.data/records.sqlite`不被测试写入。截图与结构化结果保存在`tmp/acceptance/<检查名>/`；该目录是测试产物，不属于提交素材。

`desktop-baseline.cjs`同时记录页面与内部滚动、返回入口命中和资源错误。`layout-probe.cjs`给出的裁切/字号线索须对照截图；不可把隐藏辅助文字或SVG行框自动当成可见字形裁切。入口必须是生产构建，不能用开发热更新页面代替。

若要针对自己启动的**隔离测试服务**运行单个脚本，可设置`NOVA_TEST_BASE_URL`。`NOVA_LINKAGE_CHAPTERS=10,12`用于筛选章节；`NOVA_QA_OUTPUT`指定本项目内证据目录；跨章作品复跑由`learning-flows.cjs`的`NOVA_QA_FLOW_VARIANT=workshop`与`NOVA_QA_CROSS_CHAPTERS=10,12`控制，需在同一输出目录先取得真实10/12章导出包。运行方式为`node apps/platform/tests/acceptance/<脚本名>`。不要把账户测试指向正式展示库。

`return-forensics.cjs`用于返回遮挡和字形边界，`canvas-resize.cjs`用于画布缩放与指针对应，`group-drag.cjs`记录真正的拖放事件。它们使用同一环境配置，不依赖旧工作组端口或工作树目录。旧阶段证据服务器已移除。

通过的范围以根`docs/实际验收.md`为准。软件回归、测试角色的学习链和真实学生试教分开记录；进入自由探索、点击次数、构建成功都不直接代表知识掌握。

平台检查会先通过真实第10章操作生成两版项目，再验证账号隔离、离线/重连、冲突和恢复点；无需依赖其他工作树的旧导出包。桌面检查对失败、缺章或不可点击返回设置非零退出码，图字交叠仍需结合专项检查和截图。
