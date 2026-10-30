# 奇点开发文档

- [项目介绍、构建与部署](../README.md)
- [十三课时地图](课程地图.md)
- [高中四章实现](highschool-concepts.md)
- [分阶段验收记录](实际验收.md)
- [第三方许可](licenses/)

公开仓库以当前课程源码、运行素材和本目录文档为范围。历史文档中提到的“资料-制作过程”“资料-设计与开发文档”和比赛报送材料属于完整本地项目，不随本源码仓库上传。历史验证记录不等同于最新部署的全量交互验证。

## 网页发布

`npm run build:site`构建十三章并在`dist-site/`组装纯前端站点，`npm start`在4173端口预览。Windows导出和在线站点使用同一个`tools/static-site.cjs`，静态客户端按页面层级加载。课程链接以`shared/linkage/course-links.js`为唯一入口，支持根目录与`/nova/`项目路径。
