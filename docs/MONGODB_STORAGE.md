# Visit China：免费存储拆分与 Atlas 迁移

2026-09-26。已完成 Atlas 免费集群的真实接入、私有备份、导入与线上验收。正式站点当前使用 MongoDB；原 Blob 保留且已验证内容不变。过程与证据见 [迁移记录](ATLAS_CUTOVER_2026_09_26.md)。

## 数据去哪里

- GitHub：公开源码、脱敏与合成评测、技术文档。下载档案固定在 `v6.6-public-data-20260926` Release。没有上传私人对话或账户凭据。
- Vercel：网页与 API、服务器密钥、运行必需索引；20,000 条离线回放仍在运行时可用，原始 JSON 改为 gzip，按需解压。公共下载转到 GitHub。评测正文、证据文档和离线整站 HTML 不再重复部署。
- Atlas：现已保存 Operations 事件、资料、审核、反馈与策略状态。`visit_china.operations_state`，单文档 CAS 原型，8MB 上限。它是低并发演示方案，不是无限扩展的生产分析仓库。

## 免费集群

[MongoDB 官方创建指南](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)。选择 Free/M0，勿选 Flex 或付费专用集群。可与金枢共用一个免费集群，但建两个数据库、两个仅有对应数据库 readWrite 权限的用户：`visit_china` 与 `jinshu`。连接串只存服务端。

Atlas Network Access 必须允许部署服务器出站地址；本机验收只添加当前 IP。Vercel 动态出站若必须允许所有 IP，应使用独立强密码、TLS、数据库最小权限，并记录这一限制；不要误认为配置了连接串就已连通。

本项目环境：`OPS_STORE=mongo`、`MONGODB_DB=visit_china`、`MONGODB_URI=<Atlas连接串>`。**迁移验收通过前不设置 OPS_STORE=mongo**。配置失败不会退回本地空库。

## 迁移步骤

1. 在线上设 `OPS_STORE_READ_ONLY=1` 并部署，暂停写入。确认所有旧实例退出、没有写入请求。
2. 在可信本机从服务端环境加载旧 Blob 连接配置，设置同样的只读标记。运行 `node --env-file=.env.production.local tools/migrate-ops-store.cjs export private/ops-backup.json`。导出文件含私有数据，已忽略于 Git。
3. 在本机环境添加目标 `MONGODB_URI` 与 `MONGODB_DB=visit_china`；运行同一工具的 `import`，然后 `verify`。目标若已有 `_id=v1` 则拒绝覆盖；核验内容哈希与各集合记录数。
4. 配置线上 `OPS_STORE=mongo`，仍保持只读，部署并检查资料数、账号及后台记录。
5. 再取消只读并部署，验证新事件只写入 MongoDB。旧 Blob 保留为迁移前备份。

回滚：开放写入前可切回旧 Blob；开放写入后须先冻结 MongoDB 并导出新增数据，不能直接切回旧快照丢失新事件。工具不会删除旧数据、自动切换配置或覆盖已有目标。

现有登录、五审核员、强版本条件写入、反馈30天/200条与失败30天/500条保留策略均继续使用。

## 接入回归与线上验收

MongoDB 模式接入同一套 Travel Call 资料读取、撤回生效、检索执行记录、回答评估和失败追踪；即使取消 Blob 环境变量也不影响这些路径。MongoDB 配置不会被当作本机默认管理员环境。适配器的并发、只读及上述链路经过回归测试；本次还完成了真实 Atlas 权限隔离、迁移哈希、生产读写验收。

2026-09-26 切换后在线上再次验证：错误密码返回 401；页面公布的管理员账号可登录并连接真实 DeepSeek；Operations 返回 storage=mongo，可读取 20,000 条压缩评测目录及519条合并展示资料；三个公开下载入口返回 307 至固定 GitHub Release。合成 DeepSeek 验收请求标记为 evaluation，不计入真实业务转化；空事件批次验证 Mongo 写入版本递增，没有增加虚构点击数据。
