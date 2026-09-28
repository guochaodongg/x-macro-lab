# EDID-X-LAB · EDID 工具箱

对 [edidcraft.com](https://edidcraft.com/) 全部功能的**完整复刻**：解析（Decoder）、生成（Encoder）、校验（Validator）、时序计算（Timing Calculator），外加一页 EDID 速成课。

- **纯静态**：`index.html` + `css/` + `js/`，可直接放到 GitHub Pages / Cloudflare Pages / 任意静态服务器。
- **前端实现**：解析、生成、校验与时序计算全部由浏览器端 JavaScript 完成。

| 项 | 值 |
| --- | --- |
| 在线地址 | <https://guochaodongg.github.io/edid-x-lab/> |
| GitHub 仓库（主） | <https://github.com/guochaodongg/edid-x-lab> |
| Gitee 仓库（国内镜像） | <https://gitee.com/guochaodong_admin/edid-x-lab> |
| 本地目录名 | `edid-x-lab` |

> 项目名、仓库名与本地目录名统一为 **edid-x-lab**（页面品牌名写作 **EDID-X-LAB**）；本文所有命令示例都以目录名 `edid-x-lab` 为准。

---

## 1. 功能清单

| 标签页 | 能力 |
| --- | --- |
| **解析** | 基础块全字段（厂商 PNP、产品、序列号、制造日期、数字/模拟输入、屏幕尺寸、Gamma、DPMS、sRGB、色度坐标 + CIE 1931 色度图）、既定时序、标准时序、4 个描述符（DTD / 0xFC 名称 / 0xFF 序列号 / 0xFE 文本 / 0xFD 范围限制 / 0x10 空）、CEA-861 全部数据块、DisplayID 分节、VTB、块映射表；带字段提示的分块十六进制查看器 |
| **生成** | 可视化表单组包：厂商/产品/序列号、日期与版本、数字（位深/接口/颜色编码）或模拟（电平/同步方式）输入、DPMS 与特性位、色度坐标（一键 sRGB / D65）、17 项既定时序、最多 8 组标准时序、4 个可切换类型的描述符槽位、可增删的 CEA / DisplayID / VTB / 块映射扩展块；校验和自动计算，实时十六进制预览 + 自校验结果 |
| **校验** | 结构、固定头、块长度、逐块校验和、扩展块数量一致性、日期范围、色度合法性与 sRGB 一致性、时序自洽、描述符格式（文本终止符、范围限制填充、CVT 参数）、CEA/VSDB/HDR/色度块一致性；按**错误 / 警告 / 提示**三级报告 |
| **时序计算** | VESA **CVT 1.1**（标准消隐）与 **CVT 1.2**（RB / RBv2 / RBv3）、**GTF 1.1**（含隔行与缩边）；输出完整参数表、消隐结构图、X11 `Modeline`、`xrandr --newmode` / `--addmode`，以及可直接写进 DTD 的 18 字节 |
| **时序对比** | 多标准时序对比计算器（对标 Tom Verbeure 的 Video Timings Calculator）：一次计算 CVT / CVT-RB / CVT-RBv2 / CEA-861 / DMT / 自定义六种时序，并核算 DP / HDMI / DVI / SDI / RFC4175 各接口带宽余量 |
| **伽马验证** | 读取 CA410 色温仪测量数据与灰阶占比表（.xlsx，浏览器本地解析，自研 ZIP / OOXML 读取器），按所选 Gamma 曲线（GammaBT1886 / 1.8 / 2.0 / 2.2 / 2.4 / 2.6）的占比映射生成参考曲线（峰值亮度 × 灰阶占比）、白点一致性（Wx / Wy）图表，并计算平均 Gamma（对数回归，与目标值偏差 ±0.05 内标绿）；可导出 PNG。**内置 6 组实测数据集**（`data/` 内，默认载入 BT1886），切换曲线即自动重绘对应图表，也支持上传自己的 .xlsx |
| **学习 EDID** | 8 节速成课：EDID 是什么、基础块字节地图、四种描述符、18 字节 DTD 逐字节解释、CEA-861 与 DisplayID、CVT/GTF 原理、常见坑、参考资料 |
| **DDC/CI 控制** | 像 MCCS 工具那样直接读写显示器 VCP 特性：连接本地桥接后列出物理显示器、读/写任意 VCP 码（亮度 / 对比度 / 输入源 / 电源模式…）、扫描常用码、读取并解析显示器 capabilities 字符串；离线也有**报文构建器**（逐字节字段解释 + 校验和核对 + 等价 `ddcutil` / `i2ctransfer` / PowerShell / curl 命令）和 **182 条 VCP 码参考表**（中英文名、类型 C/NC/CNC/T、读写权限、分组、枚举值含义） |
| **关于** | 项目介绍、部署说明、开发说明、清除草稿 |

附加能力：拖放 `.bin` / `.hex` / `.txt` / `.dat` / `.edid` 文件、粘贴任意十六进制文本（空格/换行/逗号/`0x` 前缀自动忽略）、`.bin/.hex` 导出、复制到剪贴板、打印 / 存 PDF、深色/浅色主题、自动保存草稿到 `localStorage`、**解析结果一键送进生成器**。

---

## 2. 目录结构

```
edid-x-lab/
├── index.html              # 页面骨架 + 内联 SVG 图标 + 各标签页内容
├── css/
│   └── styles.css          # 设计系统（浅色/深色变量、组件、打印样式）
├── data/                   # 内置伽马测量数据（原始 .xlsx，可下载）
│   ├── GammaBT1886.xlsx    # CA410 测量数据（A=Input Level, G=Luminance, E=Wx, F=Wy）
│   ├── Gamma1_8.xlsx  …  Gamma2_6.xlsx
│   └── Gamma_Gray_0_255_Duty.xlsx   # 灰阶占比表（B~G 列 = 6 条曲线的占比）
├── js/
│   ├── edid-core.js        # 常量表 + 工具（校验和、色度、厂商码、VIC 表…）
│   ├── timing.js           # CVT / GTF 计算、Modeline、xrandr
│   ├── vtc-data.js         # DMT(88) 与 CEA-861 VIC(154) 标准时序数据表
│   ├── video-timings.js    # 多标准时序计算：CVT/RB、DMT/VIC 查表、带宽核算
│   ├── edid-decoder.js     # 字节流 → 结构化对象
│   ├── edid-encoder.js     # 模型 → 字节流（含 7 套预设）
│   ├── edid-validator.js   # 结构 / 语义校验，分级报告
│   ├── edid-report.js      # 结构化对象 → HTML 片段（纯字符串，无 DOM 依赖）
│   ├── zip-lite.js         # 纯 JS ZIP 读取（stored + deflate 解压，自研 inflate）
│   ├── xlsx-lite.js        # 纯 JS .xlsx（OOXML）解析：工作表 / sharedStrings / 单元格
│   ├── gamma.js            # 伽马验证逻辑（数据组装、平均 Gamma、SVG 折线图，无 DOM 依赖）
│   ├── gamma-data.js       # 内置数据集（由 _ref/gen-gamma-data.js 从 data/*.xlsx 生成）
│   ├── mccs-data.js        # MCCS VCP 码表（182 条）+ DDC/CI 操作码表，纯数据
│   ├── mccs.js             # DDC/CI 协议逻辑：报文构建、应答解析、能力字符串解析、命令导出（无 DOM 依赖）
│   └── app.js              # 界面接线：标签页、表单、草稿、导出
├── tools/                  # DDC/CI 本地桥接（非页面依赖，用到时才需要）
│   ├── ddc-windows.ps1     # Windows 后端：dxva2.dll（P/Invoke），支持一次性与常驻两种模式
│   └── ddc-bridge.js       # 零依赖 Node HTTP 桥接：静态站点 + /api/*，串行化 DDC 事务
└── README.md
```

脚本按 `core → timing → vtc-data → video-timings → decoder → encoder → validator → report → zip-lite → xlsx-lite → gamma → gamma-data → mccs-data → mccs → app` 的顺序加载，**顺序不能改**（都是普通 `<script>`，不是 ES module）。

> `data/*.xlsx` 是原始测量文件，页面不会去 fetch 它们（`file://` 下会被 CORS 拦），
> 而是用 `js/gamma-data.js` 里的预提取数组，因此双击 `index.html` 也能直接看到内置图表；
> 原始文件放在 `data/` 供下载与再次上传验证。改了 `data/` 下的表格后重新执行
> `node _ref/gen-gamma-data.js` 即可刷新内置数据。

---

## 3. 部署状态与更新流程（GitHub Pages）

### 3.1 当前部署信息

| 项 | 值 |
| --- | --- |
| 在线地址 | <https://guochaodongg.github.io/edid-x-lab/> |
| 仓库 | <https://github.com/guochaodongg/edid-x-lab>（公开） |
| 分支 | `master` |
| Pages 源 | `/`（根目录） |
| HTTPS | 已强制 |

站点文件就在仓库**根目录**（`index.html` + `css/` + `js/`），所以访问路径最短、没有多余的一层目录。

### 3.2 日常更新

```bash
cd edid-x-lab
git add -A
git commit -m "描述这次改了什么"
git push
```

GitHub Pages 会在推送后**自动重新构建**（约 30–90 秒），不需要手动点任何按钮 —— 这一点比 Gitee Pages 省事得多。

### 3.3 从零部署到别的仓库（换账号或换名字时）

```bash
cd edid-x-lab
git init -b master
git add .
git commit -m "EDID-X-LAB: EDID toolkit"
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin master
```

然后在仓库 **Settings → Pages** 里把 **Source** 设为 `Deploy from a branch`，**Branch** 选 `master` + `/(root)`，保存即可。

### 3.4 几点提醒

- 本项目全部用**相对路径**引用资源，所以放在子目录（如 `/edidcraft/`）里也能正常工作。
- 仓库里加一个空的 `.nojekyll` 文件可以跳过 Jekyll 处理（本项目的资源目录不以 `_` 开头，其实不加也没问题）。
- 想绑定自定义域名：同一页面的 **Custom domain** 填域名，然后在域名解析里加一条 `CNAME` 记录指向 `<用户名>.github.io`。
- 更新内容只需 `git push`，Pages 会自动重新构建。

---

## 4. 为什么没有部署到 Gitee Pages

**Gitee Pages 已经停服，无法再使用**，所以本项目最终落在 GitHub Pages。这不是配置问题：

- Gitee 官方没有发公告，但用户咨询客服得到的答复是：**Gitee Pages 功能已经下线、无法再使用**，建议迁移到 GitHub 等平台。
- 实测 `/pages` 路由在**任何**仓库上都返回 404；`*.gitee.io` 域名下**所有**站点都是 404（包括此前正常运行、别人文档里还写着"可直接免费托管"的第三方站点）。
- 仓库页的「服务」菜单里已经没有 Pages 入口了。

> 网上仍有文章说"Gitee Pages 并未下线"，其中不少是 AI 生成的内容农场 —— 有的甚至描述"Settings → Pages 页面"和 `.gitee/pages.yml` 配置，那是 GitHub 的形态，Gitee 从来没有这两个东西。实测结果和客服答复才是准的。

如果你想把 Gitee 仓库留作国内镜像，它仍然有效：<https://gitee.com/guochaodong_admin/edid-x-lab>，
推送用 `git push gitee master`（本项目本地已把 Gitee 配成一个名为 `gitee` 的远程）。

---

## 5. 部署到其他静态托管

因为是纯静态文件，以下平台都可以直接用（构建命令留空、输出目录填 `edid-x-lab` 或 `.`）：

- **Cloudflare Pages** / **Netlify** / **Vercel** — 拖拽文件夹即可
- **对象存储** — 阿里云 OSS、腾讯云 COS、七牛等，开启静态网站托管后上传整个目录
- **自建 nginx** — 把目录扔进站点根目录即可，无需任何 rewrite 规则

---

## 6. DDC/CI 直连显示器（本地桥接）

**浏览器无法直接访问 I²C/DDC 总线**——没有任何 Web API 能发 DDC/CI 报文。所以「DDC/CI 控制」页采用
「静态页面 + 本地桥接程序」的结构：桥接程序跑在本机、用系统 API 操作显示器，页面通过
`http://127.0.0.1:8760` 访问它。

### 6.1 启动桥接

Windows（用 dxva2.dll，无需装任何依赖）：

```bash
cd edid-x-lab/tools
node ddc-bridge.js                 # 默认 127.0.0.1:8760，静态根目录指向上一级
# 浏览器打开 http://127.0.0.1:8760/?tab=mccs
```

Linux / macOS（依赖 `ddcutil`，桥接会自动识别后端）：

```bash
sudo apt install ddcutil           # macOS: brew install ddcutil
cd edid-x-lab/tools && node ddc-bridge.js
```

也可以不用桥接，直接命令行操作单个显示器：

```bash
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action list
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Monitor 0 -Action get -Code 0x10
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Monitor 0 -Action set -Code 0x12 -Value 75
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action serve   # 常驻模式，stdin/stdout 逐行 JSON
```

### 6.2 桥接接口

| 接口 | 说明 |
| --- | --- |
| `GET /api/ping` | 健康检查 + 当前后端（`dxva2` / `ddcutil`） |
| `GET /api/monitors` | 列出物理显示器（含 `\\.\DISPLAYn` 与描述） |
| `GET /api/vcp?monitor=0&code=0x10` | 读 VCP：返回 `current` / `max` / `vcpType` |
| `POST /api/vcp` | 写 VCP：body `{"monitor":0,"code":16,"value":70}` |
| `GET /api/scan?monitor=0` | 扫描常用 VCP 码，返回每个码是否支持及当前值 |
| `GET /api/capabilities?monitor=0` | 读取能力字符串（原样 ASCII） |
| `POST /api/save` | 保存当前设置到显示器 NVRAM（`SaveCurrentMonitorSettings` / `ddcutil scs`） |
| `GET /api/raw` | 恒返回 501：dxva2 只提供 VCP 与能力字符串接口，**不接受任意字节流** |

桥接把硬件操作串行化（内部维护一个队列 + 常驻的 PowerShell `serve` 子进程），因为 DDC/CI 事务
不能并发——竞态会让显示器返回乱码或直接 NAK。返回的错误码会被翻译成中文提示，例如
`0xC0262589`（`ERROR_GRAPHICS_I2C_ERROR_TRANSMITTING_DATA` 家族）会提示「该 VCP 码不被显示器支持」。

### 6.3 报文格式与 VCP 码宽度

```
主机 → 显示器： [0x51] [0x80|n] [opcode] [data…] [chk]        chk = 0x6E ⊕ 前面所有字节
显示器 → 主机： [0x6E] [0x80|n] [opcode] [data…] [chk’]       chk’ 的地址项各实现不同，页面会逐个试算
```

VCP 码字段是**变长**的，长度字节把它算在内，三种报文的换算式不同：

| 报文 | 载荷构成 | 长度字段 |
| --- | --- | --- |
| 读 VCP（0x01） | `opcode` + 码(n) | `0x80\|(1+n)` |
| 写 VCP（0x03） | `opcode` + 码(n) + 数值(2) | `0x80\|(3+n)` |
| VCP 应答（0x02） | `opcode` + 结果码(1) + 码(n) + 类型(1) + 最大值(2) + 当前值(2) | `0x80\|(7+n)` |

n = 1 是**通用形式**，四个独立实现都这么做，页面默认也用它（选「自动」时 ≤0xFF 用 1 字节）：

- Windows `dxva2.dll`：`SetVCPFeature(hMonitor, BYTE bVCPCode, …)`——参数本身就是单字节；
- Linux `ddcutil`（作者给的参考报文）：请求 `6e 51 82 01 10`、应答 `6f 6e 88 02 00 10 …`；
- macOS `ddcctl`：写 `51 84 03 <code> <hi> <lo>`、读 `51 82 01 <code>`；
- `ddcci.py` 等第三方库同样如此。

2 字节（`0x83` / `0x85`）是 DDC/CI 1.1 允许的变体，少数主机用；3 字节只用于 0xE0 以上的厂商
24 位扩展码（如实测某型号的 `0xE2A002`）。**应答解析不看请求，直接从长度字段反推码宽**，所以
无论对方用哪种宽度都能正确解出码值。注意 dxva2 因为参数是单字节，**无法寻址 0xE0–0xFF 之外
的扩展码**，这类码只能配合 `ddcutil` 使用——页面会对这种组合给出告警。

### 6.4 离线可用范围

不用桥接也能用（纯前端逻辑）：**报文构建器**（含逐字节字段解释、校验和核对、等价
`ddcutil` / `i2ctransfer` / PowerShell / curl 命令）与 **182 条 VCP 码参考表**；粘贴一段
capabilities 字符串也能解析出型号、`mccs_ver`、支持的操作码、支持的全部 VCP 码及其枚举值。
只有「读/写/扫描/保存」需要桥接。

### 6.5 写入注意事项

- 写 VCP 只是**临时生效**，显示器断电即丢；要保留得再点一次「保存设置」（写 NVRAM，次数有寿命）。
- `0xD6` 电源模式写 `0x05` 会关掉画面（面板键或重新上电才能恢复），`0x04` 是真关机。
- 部分显示器带 OSD 锁定或 DDC/CI 开关，被关掉时桥集会返回「不支持」，先在 OSD 里打开。

---

## 7. 复用引擎（二次开发）

引擎文件都是普通脚本，会挂到 `window` 上，可以脱离界面单独使用：

```html
<script src="js/edid-core.js"></script>
<script src="js/timing.js"></script>
<script src="js/edid-decoder.js"></script>
<script src="js/edid-encoder.js"></script>
<script src="js/edid-validator.js"></script>
<script>
  // 二进制 → 结构化对象
  var report = EDIDDecoder.decode(bytes);        // { ok, base, extensions, ... }

  // 模型 → 二进制（校验和自动生成）
  var model = EDIDEncoder.defaultModel();        // 也可以先套用预设
  EDIDEncoder.FORMAT_PRESETS['4k'].apply(model);
  var out = EDIDEncoder.encode(model);           // { bytes, hex, warnings }

  // 校验
  var check = EDIDValidator.validate(bytes);
  // { isValid, status, errors[], warnings[], info[], summary, messages, decoded }

  // 时序
  var t = EDIDTiming.computeCVT({ width: 2560, height: 1440, refreshRate: 144, rbVersion: 2 });
  EDIDTiming.modeline(t);
  EDIDTiming.xrandrNewmode(t);
</script>
```

主要导出：

| 全局对象 | 内容 |
| --- | --- |
| `EDIDCore` | 常量表（`ESTABLISHED`、`CEA_VIDEO_CODES`、`SPEAKER_ALLOCATION`…）与工具（`bytesToHex`、`checksum`、`manufacturerFromBytes`、`chromaToXy`、`sRGBChromaticity`、`establishedKey`…） |
| `EDIDTiming` | `computeCVT`、`computeGTF`、`verticalSyncFor`、`modeName`、`modeline`、`xrandrNewmode`、`xrandrAddMode`、`xrandrAddOutput`、`timingRows`、`compare(cvt, gtf)`、`PRESETS` |
| `EDIDDecoder` | `decode(bytes)`、`decodeHexString(hex)`、`parseBase`、`parseDescriptor`、`parseDTD` |
| `EDIDEncoder` | `encode(model)`、`defaultModel()`、`defaultDTD()`、`dtdFromTiming()`、`packDTD()`、`ceaHdExtension()`、`cea4kExtension()`、`FORMAT_PRESETS`（`1080p` / `1440p` / `4k` / `ultrawide` / `laptop` / `legacy` / `hdr`） |
| `EDIDValidator` | `validate(bytes)`、`checkDTD(dtd)` |
| `EDIDReport` | `decodeReport`、`validationReport`、`timingReport`、`hexViewer`、`chromaPlot`、`kv`、`card`、`chip`、`tableHtml`、`esc` |
| `MCCS` | `buildGetVCP`、`buildSetVCP`、`buildSaveSettings`、`buildVcpReset`、`buildGetCapabilities`、`buildRaw`、`build(kind, opts)`、`parseReply`、`verifyChecksum`、`describe`、`parseCapabilities`、`vcp`、`vcpName`、`vcpText`、`formatValue`、`toDdcutil`、`toI2cTransfer`、`toCurl`、`toBridgeScript` |
| `MCCSData` | `VCP`（182 条码表）、`OPCODES`（9 条操作码）、`VALUES`（枚举值表） |

---

## 8. 自测

> 发布仓库包含 `index.html` + `css/` + `js/` + `data/` + `tools/`，**不含测试脚本**（测试在仓库外的 `_ref/`）。下面两种方式都不需要安装任何第三方包，可随时用来验证引擎是否完好。

### 8.1 Node 里跑一遍（推荐）

引擎文件是普通脚本，用 `vm.runInThisContext` 在同一个全局上下文里依次加载即可（它们靠 `window`/`global` 互相引用，所以**必须共享同一个上下文**）：

```js
// check.js —— 放在 edid-x-lab/ 下，执行：node check.js
const fs = require('fs'), vm = require('vm');
['edid-core', 'timing', 'edid-decoder', 'edid-encoder', 'edid-validator', 'edid-report']
  .forEach(f => vm.runInThisContext(fs.readFileSync('js/' + f + '.js', 'utf8'), { filename: f }));

// 1) 7 套预设：组包 → 自校验，应当零错误
Object.keys(EDIDEncoder.FORMAT_PRESETS).forEach(key => {
  const m = EDIDEncoder.defaultModel();
  EDIDEncoder.FORMAT_PRESETS[key].apply(m);
  const out = EDIDEncoder.encode(m);
  const v = EDIDValidator.validate(out.bytes);
  console.log(key.padEnd(10), out.bytes.length + 'B', v.status, 'err=' + v.errors.length, 'warn=' + v.warnings.length);
});

// 2) 编解码往返：encode → decode，厂商/产品码应当一致
const m = EDIDEncoder.defaultModel();
EDIDEncoder.FORMAT_PRESETS['4k'].apply(m);
const bytes = EDIDEncoder.encode(m).bytes;
const d = EDIDDecoder.decode(bytes);
console.log(d.ok, d.base.manufacturer, d.base.productCode);

// 3) 时序：CVT 与 GTF 对比
const cvt = EDIDTiming.computeCVT({ width: 2560, height: 1440, refreshRate: 144, rbVersion: 2 });
const gtf = EDIDTiming.computeGTF({ width: 2560, height: 1440, refreshRate: 144 });
console.log(EDIDTiming.modeline(cvt));
console.log(EDIDTiming.compare(cvt, gtf).recommendation);
```

### 8.2 浏览器控制台里跑一遍

打开页面后按 F12，在控制台直接输入（引擎已挂在 `window` 上）：

```js
Object.keys(EDIDEncoder.FORMAT_PRESETS).map(k => {
  const m = EDIDEncoder.defaultModel();
  EDIDEncoder.FORMAT_PRESETS[k].apply(m);
  const v = EDIDValidator.validate(EDIDEncoder.encode(m).bytes);
  return k + ' → ' + v.status + ' / err=' + v.errors.length;
});
```

### 8.3 界面层

界面（`app.js`）依赖真实 DOM，需要 [jsdom](https://www.npmjs.com/package/jsdom) 才能自动化。jsdom **不是**项目依赖，装在目录之外即可，避免污染这个纯静态仓库：

```bash
mkdir /tmp/edid-domtest && cd /tmp/edid-domtest && npm install jsdom
NODE_PATH=/tmp/edid-domtest/node_modules node your-dom-test.js
```

Windows 上把 `NODE_PATH` 换成 `C:\...\edid-domtest\node_modules` 即可。

> 本项目的测试脚本（`_ref/test-*.js`，覆盖编解码往返、时序矩阵、报告层、时序对比、伽马、
> DDC/CI 协议、以及 jsdom 驱动的界面层）都在仓库外的 `_ref/`，不会随静态站点发布。
> 当前基线：**108 / 356 / 2094 / 20095 / 122 / 258 / 64，全部 0 失败**。

---

## 9. 已知边界

- **DisplayID** 只解析到“分节”层级（标签/版本/长度/偏移），不做逐节内容解释；生成器也按分节字节原样写入。
- **VTB** 与**块映射表**同样只做结构与标签层面的处理。
- **HDMI Forum VSDB**（OUI `C4-5D-D8`）只读版本号，不展开其全部能力位。
- 音频数据块最多 10 个描述符；标准时序最多 8 组；描述符固定 4 个槽位——这些都是 EDID 规范本身的限制。
- 校验规则以 VESA 规范与 Linux `edid-decode` 的判定为参照，但个别厂商的“非标但可用”做法可能被报为警告，请结合实际情况判断。
- **时序对比**页中 CEA-861 / DMT 列只覆盖标准表内收录的模式；表内个别条目（如 DMT 0x0F）在参考数据源中即不完整，会显示“—”。自定义模式只约束总消隐量与像素时钟，前后沿按 CVT-RB 布局确定性地分配。隔行模式下 CVT 系列显示场有效行数（规范定义），CEA-861 / DMT 显示整帧行数。
- **伽马验证**页只读取每个工作簿的**第一个工作表**，仅支持 `.xlsx / .xlsm`（OOXML 格式，与 Python 版工具一致）；`.xls`（老二进制格式）不支持。平均 Gamma 的对数回归算法与内部 Python 版「Gamma Curve Verification Tool」逐点一致（含边界跳过规则），基准数据实测结果为 2.157。
- **伽马验证的内置数据集**（`data/` 内 6 份 CA410 实测数据 + 1 份灰阶占比表）是定版样本：内置模式下行号只能在已提取的区间（测量 271-526 / 占比 2-257）内收窄，列号固定为 A/G/E/F、B~G；需要其它列或整表其他区间时请切到「自定义上传 .xlsx」。

- **DDC/CI 控制**页必须配合 `tools/` 下的本地桥接才能操作硬件：浏览器没有访问 I²C 总线的 API，`file://` 或 GitHub Pages 上只能使用报文构建器、码表与能力字符串解析。桥接监听在回环地址并带 CORS 头，只接受本机页面发起的请求；在公共网络中不要把它暴露到 `0.0.0.0`。
- 显示器差异极大：capabilities 未声明某码不等于一定不支持（反之亦然，以实际读写结果为准）；`0xE0–0xFF` 是厂商自定义区间，同一个码在不同品牌含义完全不同。Windows 的 dxva2 路径只能寻址 `0x00–0xFF` 的单字节 VCP 码，`0xE2A002` 这类 24 位扩展码需要 `ddcutil`。实测本机 `DISPLAY1` 是虚拟显示器，能读 VCP 但读能力字符串会返回 `INVALID_MESSAGE_LENGTH`，属正常现象。

---

## 10. 说明

本项目的代码与文案为独立实现，功能对标 edidcraft.com。「时序对比」页的功能对标 Tom Verbeure 的
Video Timings Calculator（其 DMT/VIC 标准时序数据与 CVT 公式来自 VESA/CTA 公开规范，算法经交叉验证对齐）。
「伽马验证」页为内部 Python 版「Gamma Curve Verification Tool」的 Web 移植，数据读取、列/行配置与
平均 Gamma 算法与原工具保持一致；内置数据集即该工具配套的 CA410 实测样本（`data/` 目录，可下载）。
EDID / CEA-861 / DisplayID / CVT / GTF 的具体细节请以 VESA 与 CTA 官方规范为准。
