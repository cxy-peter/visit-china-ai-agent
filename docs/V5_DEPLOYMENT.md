# V5 本地运行、凭据和部署

## 更新既有本地项目

先备份未提交修改，勿覆盖.env和data/runtime。GitHub主分支有本次普通源码后，可以正常git pull；遇到冲突先检查，不执行git reset --hard。

```bash
npm ci
npm test
npm run build
npm start
```

浏览器打开http://127.0.0.1:8787。单文件HTML只是前端体验；完整ZIP/dist含V4资料页。语音建议在localhost或HTTPS打开；具体浏览器语音兼容性依其服务实现，权限拒绝或识别服务不可用会明确提示。项目不会访问你电脑，需你自己启动已更新的代码。

## DeepSeek

本机初始管理员admin / demo2026。Operations登录→展开模型设置→填写自己的Key并选择模型。Key在服务进程内存，不持久写网页；重启清除。也可配置.env中的DEEPSEEK_API_KEY、DEEPSEEK_MODEL和ADMIN_PASSWORD。调用前另勾选对话模型同意。只传脱敏文字，不传麦克风音频给DeepSeek。普通访客的受保护模型调用需通过后端已配置的DEMO_ACCESS_TOKEN；当前网页没有专用访问码输入框，先用已登录管理员验证本机。错误无usage不代表绝不会计费。

## 五人审核

在本机运行：

```bash
node v5/provision.js reviewer1 reviewer2 reviewer3 reviewer4 reviewer5
```

分别保存终端生成的随机密码并交给指定审核者，然后重启Node。registry已存在时脚本拒绝覆盖。生成文件仅加盐哈希，位于data/runtime/reviewers.local.json；别上传。该脚本默认使用项目data/runtime，使用自定义LOCAL_DATA_DIR时应将私有registry安全放在那个目录或提供REVIEWERS_JSON环境变量。管理员发起候选和回归，五名审核者分别登录批准同一hash，第五票后自动发布；已经进行的会话仍保持旧版本。

不要把管理员密码分给所有人再称为五人审核，也不要在页面新增“选择审核员身份”的后门。单人演示可使用多个测试账号，但必须称为演示。

## Vercel

当前vercel.json：Framework Other，build=npm run build，output=dist。它能提供公开的语音前端（受浏览器能力限制）和静态来源工作台；没有共享数据库或会话后端时，Operations会说明真实五人审核需本机Node，不能假装云端已共享。

工具验证中Vercel账户可读，但未发现本项目，直接deploy动作返回不可用。不要因此覆盖金枢项目。任何后续导入/部署都须核对实际结果；只有实际返回且访问成功的URL才是已部署站点。主分支推送不是部署证明。

不能让Vercel网页自动读你电脑localhost。真实云端DeepSeek、身份和审批先接托管后端及持久数据库；实时语音worker另部署。当前单进程内存/本地文件不适用于多实例并发。
