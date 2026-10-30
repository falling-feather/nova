# 第三方数据与软件

## 训练数据：The Quick, Draw! Dataset

- 来源：Google Creative Lab，<https://github.com/googlecreativelab/quickdraw-dataset>
- 许可：Creative Commons Attribution 4.0 International（CC BY 4.0），<https://creativecommons.org/licenses/by/4.0/>
- 本章的使用方式：从 simplified ndjson 中选取 12 个题目（鱼、鸟、花、树、房子、星星、帆船、螃蟹、鲸鱼、太阳、灯塔、蝴蝶），每个题目按文件顺序取前 20,000 幅被游戏识别出来的涂鸦，重新栅格化为 32×32 灰度图，用来训练“沙画师傅”扩散模型。
- 网页里直接显示原始涂鸦的地方：`public/models/practice-*.png`（每个题目随机抽 160 幅），用于“师傅的练习本”“找最像的训练图”“借一幅画”和致谢墙。这些图片经过缩放和栅格化，属于对原数据的改动。
- 致谢：感谢所有在 “Quick, Draw!” 中留下涂鸦的人。第 24 环节“致谢墙”在课程中向学生说明数据来源、规模和许可。

## 运行时软件

| 软件 | 版本 | 许可 | 用途 |
|---|---|---|---|
| onnxruntime-web | 1.30.0 | MIT | 在浏览器中运行扩散模型（WASM，单线程） |

## 开发与训练工具（不随网页分发）

| 软件 | 许可 | 用途 |
|---|---|---|
| PyTorch | BSD-3-Clause | 训练与导出模型 |
| onnx、onnxruntime（Python） | Apache-2.0 / MIT | 导出与核对模型 |
| NumPy、Pillow | BSD / HPND | 数据处理与栅格化 |
| Vite、TypeScript | MIT / Apache-2.0 | 构建网页 |
| Playwright | Apache-2.0 | 自动试玩检查 |

## 本章自有内容

模型权重（`public/models/sand-master.onnx`）沿用原第八章在上述数据上训练得到的权重，训练来源保留在工作区的 `第八章/training/`。24 张正式界面底板由内置 image_gen 根据已确认设计逐页编辑，保留场景、纸页、人物与画框，去掉文字、控件和实验示意。完整提示词、原件、尺寸与哈希见 `docs/美术来源.json`。原始 PNG 保存在 `art-source/`，网页采用 WebP 编码。插画不作为模型训练集或生成结果。课程文案、矢量图标与交互代码由本章维护。

## 字体

界面使用 Noto Serif SC 的字形子集，按 SIL Open Font License 1.1 分发，许可原文见 `public/fonts/OFL.txt`。子集通过 `tools/subset-fonts.py` 生成，改名为 Tides Serif，以遵守保留字体名称要求。正文优先使用系统中文字体。
