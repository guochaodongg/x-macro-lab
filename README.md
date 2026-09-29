# X-MACRO-LAB · 显示与 EDID 工具箱

作者：**guochaodongg**（GitHub [@guochaodongg](https://github.com/guochaodongg)）· Display Driver Firmware Engineer —— 显示驱动固件工程师。
本工具服务于显示工程日常：EDID 核对、时序核算、伽马校准、DDC/CI 调机与设备串口调试。

对 [edidcraft.com](https://edidcraft.com/) 全部功能的**完整复刻**：解析（Decoder）、生成（Encoder）、校验（Validator）、时序计算（Timing Calculator），外加一页 EDID 速成课；在此之上又扩了四件工具：**时序对比**（多标准时序与接口带宽核算）、**伽马验证**（CA410 测量数据）、**DDC/CI 控制**（直连显示器读写 VCP）与 **串口调试**（普通 / 终端双模式的 COM 口调试台）。

导航按功能域分成六组：**EDID**（解析 / 生成 / 校验 / 学习 EDID）、**Gamma**（伽马验证）、**DDC/CI**（DDC/CI 控制）、**串口调试**、**Timing**（时序计算 / 时序对比）、**关于**。

- **纯静态**：`index.html` + `css/` + `js/`，可直接放到 GitHub Pages / Cloudflare Pages / 任意静态服务器。
- **前端实现**：解析、生成、校验与时序计算全部由浏览器端 JavaScript 完成。

| 项 | 值 |
| --- | --- |
| 在线地址 | <https://guochaodongg.github.io/x-macro-lab/> |
| GitHub 仓库（主） | <https://github.com/guochaodongg/x-macro-lab> |
| 本地目录名 | `x-macro-lab` |
| 旧地址（仓库改名前） | `https://guochaodongg.github.io/edid-x-lab/`（GitHub 会自动重定向到新地址） |

> 项目名、仓库名与本地目录名统一为 **x-macro-lab**（页面品牌名写作 **X-MACRO-LAB**）；本文所有命令示例都以目录名 `x-macro-lab` 为准。
> Gitee 上的国内镜像仓库建在 [gitee.com/guochaodong_admin](https://gitee.com/guochaodong_admin)，如需与 GitHub 侧一致，请在 Gitee 后台把仓库改名为 `x-macro-lab`（**Gitee Pages 已停服**，与部署无关）。

---

## 1. 功能清单

顶部导航按 **6 个分组**组织（**EDID** / **Gamma** / **DDC/CI** / **串口调试** / **Timing** / **关于**），点分组标题展开下拉菜单；每个页面也支持深链直达，例如 `index.html?tab=mccs`。

| 分组 | 页面 | 能力 |
| --- | --- | --- |
| **EDID** | **解析** | 基础块全字段（厂商 PNP、产品、序列号、制造日期、数字/模拟输入、屏幕尺寸、Gamma、DPMS、sRGB、色度坐标 + CIE 1931 色度图）、既定时序、标准时序、4 个描述符（DTD / 0xFC 名称 / 0xFF 序列号 / 0xFE 文本 / 0xFD 范围限制 / 0x10 空）、CEA-861 全部数据块、DisplayID 分节、VTB、块映射表；带字段提示的分块十六进制查看器 |
|  | **生成** | 可视化表单组包：厂商/产品/序列号、日期与版本、数字（位深/接口/颜色编码）或模拟（电平/同步方式）输入、DPMS 与特性位、色度坐标（一键 sRGB / D65）、17 项既定时序、最多 8 组标准时序、4 个可切换类型的描述符槽位、可增删的 CEA / DisplayID / VTB / 块映射扩展块；校验和自动计算，实时十六进制预览 + 自校验结果 |
|  | **校验** | 结构、固定头、块长度、逐块校验和、扩展块数量一致性、日期范围、色度合法性与 sRGB 一致性、时序自洽、描述符格式（文本终止符、范围限制填充、CVT 参数）、CEA/VSDB/HDR/色度块一致性；按**错误 / 警告 / 提示**三级报告 |
|  | **学习 EDID** | 8 节速成课：EDID 是什么、基础块字节地图、四种描述符、18 字节 DTD 逐字节解释、CEA-861 与 DisplayID、CVT/GTF 原理、常见坑、参考资料 |
| **Gamma** | **伽马验证** | 读取 CA410 色温仪测量数据与灰阶占比表（.xlsx，浏览器本地解析，自研 ZIP / OOXML 读取器），按所选 Gamma 曲线（GammaBT1886 / 1.8 / 2.0 / 2.2 / 2.4 / 2.6）的占比映射生成参考曲线（峰值亮度 × 灰阶占比）、白点一致性（Wx / Wy）图表，并计算平均 Gamma（对数回归，与目标值偏差 ±0.05 内标绿）；可导出 PNG。**内置 6 组实测数据集**（`data/` 内，默认载入 BT1886），切换曲线即自动重绘对应图表，也支持上传自己的 .xlsx |
| **DDC/CI** | **DDC/CI 控制** | 像 MCCS 工具那样直接读写显示器 VCP 特性：连接本地桥接后列出物理显示器、读/写任意 VCP 码（亮度 / 对比度 / 输入源 / 电源模式…）、扫描常用码、读取并解析显示器 capabilities 字符串；离线也有**报文构建器**（逐字节字段解释 + 校验和核对 + 等价 `ddcutil` / `i2ctransfer` / PowerShell / curl 命令）和 **182 条 VCP 码参考表**（中英文名、类型 C/NC/CNC/T、读写权限、分组、枚举值含义） |
| **串口调试** | **串口调试** | 两种**可识别的界面模式**：**普通模式**（发送区 + 接收区，接收视图可选 文本 / HEX / HEXDUMP，带时间戳与收发记录）与**终端模式**（提示符 + 命令行 + 闪烁光标，按真实终端语义解释 CR/LF/BS/TAB）。**切到本页即自动枚举已连接的 COM 口**（含友好名与 VID/PID，并自动选回上次用过的口）；波特率 300–2000000、5–8 数据位、五种校验、1 / 1.5 / 2 位停止位、三种流控、DTR/RTS、编码、行结尾、定时发送、常用指令预设（AT / SCPI / 控制字符）；普通模式会**嗅探内容**（命中 ANSI 转义、裸 CR、BEL、BS、FF 即提示切到终端模式）。两种传输方式：**本地桥接**（列全部 COM 口，`file://` 可用）与 **Web Serial**（零安装，仅 https/localhost） |
| **Timing** | **时序计算** | VESA **CVT 1.1**（标准消隐）与 **CVT 1.2**（RB / RBv2 / RBv3）、**GTF 1.1**（含隔行与缩边）；输出完整参数表、消隐结构图、X11 `Modeline`、`xrandr --newmode` / `--addmode`，以及可直接写进 DTD 的 18 字节 |
|  | **时序对比** | 多标准时序对比计算器（对标 Tom Verbeure 的 Video Timings Calculator）：一次计算 CVT / CVT-RB / CVT-RBv2 / CEA-861 / DMT / 自定义六种时序，并核算 DP / HDMI / DVI / SDI / RFC4175 各接口带宽余量 |
| **关于** | — | 项目介绍、部署说明、开发说明、清除草稿 |

附加能力：拖放 `.bin` / `.hex` / `.txt` / `.dat` / `.edid` 文件、粘贴任意十六进制文本（空格/换行/逗号/`0x` 前缀自动忽略）、`.bin/.hex` 导出、复制到剪贴板、打印 / 存 PDF、深色/浅色主题、自动保存草稿到 `localStorage`、**解析结果一键送进生成器**。

---

## 2. 目录结构

```
x-macro-lab/
├── index.html              # 页面骨架 + 内联 SVG 图标 + 分组导航 + 各页面内容
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
│   ├── serial-data.js      # 串口调试的纯数据表（波特率 / 校验 / 停止位 / 流控 / 编码 / 视图 / 指令预设）
│   ├── serial.js           # 串口协议逻辑：编解码、HEX 视图、终端缓冲、内容嗅探、两种传输适配器（无 DOM 依赖）
│   └── app.js              # 界面接线：标签页、表单、草稿、导出
├── tools/                  # 本地桥接（非页面依赖，用到时才需要）
│   ├── ddc-windows.ps1     # DDC/CI 后端：dxva2.dll（P/Invoke），支持一次性与常驻两种模式
│   ├── serial-windows.ps1  # 串口后端：System.IO.Ports，枚举 COM 口（WMI 补友好名 / VID / PID）+ 环形接收缓冲
│   └── ddc-bridge.js       # 零依赖 Node HTTP 桥接：静态站点 + /api/*，DDC 与串口各自独立串行化
└── README.md
```

脚本按 `core → timing → vtc-data → video-timings → decoder → encoder → validator → report → zip-lite → xlsx-lite → gamma → gamma-data → mccs-data → mccs → serial-data → serial → app` 的顺序加载，**顺序不能改**（都是普通 `<script>`，不是 ES module）。

> `data/*.xlsx` 是原始测量文件，页面不会去 fetch 它们（`file://` 下会被 CORS 拦），
> 而是用 `js/gamma-data.js` 里的预提取数组，因此双击 `index.html` 也能直接看到内置图表；
> 原始文件放在 `data/` 供下载与再次上传验证。改了 `data/` 下的表格后重新执行
> `node _ref/gen-gamma-data.js` 即可刷新内置数据。

---

## 3. 部署状态与更新流程（GitHub Pages）

### 3.1 当前部署信息

| 项 | 值 |
| --- | --- |
| 在线地址 | <https://guochaodongg.github.io/x-macro-lab/> |
| 仓库 | <https://github.com/guochaodongg/x-macro-lab>（公开） |
| 分支 | `master` |
| Pages 源 | `/`（根目录） |
| HTTPS | 已强制 |

站点文件就在仓库**根目录**（`index.html` + `css/` + `js/`），所以访问路径最短、没有多余的一层目录。

### 3.2 日常更新

```bash
cd x-macro-lab
git add -A
git commit -m "描述这次改了什么"
git push
```

GitHub Pages 会在推送后**自动重新构建**（约 30–90 秒），不需要手动点任何按钮 —— 这一点比 Gitee Pages 省事得多。

### 3.3 从零部署到别的仓库（换账号或换名字时）

```bash
cd x-macro-lab
git init -b master
git add .
git commit -m "X-MACRO-LAB: EDID toolkit"
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

如果你想把 Gitee 仓库留作国内镜像，它仍然有效：<https://gitee.com/guochaodong_admin>（Gitee 侧仓库名可能仍是 `edid-x-lab`，与本项目的 GitHub 仓库名无关，**Gitee Pages 已停服、纯做代码镜像**），
推送时把 Gitee 配成一个名为 `gitee` 的远程即可：`git remote add gitee <你的 Gitee 仓库地址>`，之后 `git push gitee master`。

---

## 5. 部署到其他静态托管

因为是纯静态文件，以下平台都可以直接用（构建命令留空、输出目录填 `x-macro-lab` 或 `.`）：

- **Cloudflare Pages** / **Netlify** / **Vercel** — 拖拽文件夹即可
- **对象存储** — 阿里云 OSS、腾讯云 COS、七牛等，开启静态网站托管后上传整个目录
- **自建 nginx** — 把目录扔进站点根目录即可，无需任何 rewrite 规则

---

## 6. 本地桥接（DDC/CI 与串口共用）

**浏览器无法直接访问 I²C/DDC 总线，也无法枚举 COM 口**——没有任何 Web API 能发 DDC/CI 报文，
Web Serial 又只能列出「已授权过」的串口。所以「DDC/CI 控制」与「串口调试」两页采用
「静态页面 + 本地桥接程序」的结构：桥接程序跑在本机、用系统 API 操作显示器与串口，页面通过
`http://127.0.0.1:8760` 访问它。

一个桥接进程同时提供两套后端，各自独立排队（DDC 超时不会拖垮你的串口连接）：

```
node ddc-bridge.js
├── DDC/CI  → tools/ddc-windows.ps1   （dxva2.dll，操作显示器）
└── Serial  → tools/serial-windows.ps1 （System.IO.Ports，操作 COM 口）
```

### 6.1 启动桥接

Windows（用 dxva2.dll + System.IO.Ports，无需装任何依赖）：

```bash
cd x-macro-lab/tools
node ddc-bridge.js                 # 默认 127.0.0.1:8760，静态根目录指向上一级
# 浏览器打开 http://127.0.0.1:8760/?tab=mccs
# 串口调试页：  http://127.0.0.1:8760/?tab=serial
```

启动时会把两个页面的地址和后端可用情况一起打印出来：

```
  X-MACRO-LAB bridge is running (DDC/CI + serial).
  ------------------------------------------------------------------
  DDC/CI page:         http://127.0.0.1:8760/?tab=mccs
  Serial page:         http://127.0.0.1:8760/?tab=serial
  API base:            http://127.0.0.1:8760/api
  DDC backend:         dxva2   (platform: win32)
  Serial backend:      windows (System.IO.Ports)
  Static root:         D:\...\x-macro-lab
  ------------------------------------------------------------------
```

`Serial backend: none` 表示没有找到同目录的 `serial-windows.ps1`（或不是 Windows）——
串口调试页仍可用，但只能走 Web Serial。

> `?tab=` 是通用深链：任意页面都能直接打开，例如 `?tab=timing`、`?tab=vtc`、`?tab=gamma`。
> 页面本身记不住这些参数（点导航会走本地草稿），但它会在首屏按参数落在对应页面并高亮所属分组。

Linux / macOS（依赖 `ddcutil`，桥接会自动识别后端）：

```bash
sudo apt install ddcutil           # macOS: brew install ddcutil
cd x-macro-lab/tools && node ddc-bridge.js
```

也可以不用桥接，直接命令行操作单个显示器：

```bash
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action list
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Monitor 0 -Action get -Code 0x10
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Monitor 0 -Action set -Code 0x12 -Value 75
powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action serve   # 常驻模式，stdin/stdout 逐行 JSON
```

串口后端同样可以脱离桥接单独用（`-Action` 取 `ports|open|close|write|read|status|selftest|serve`，stdout 是 JSON）：

```bash
powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action ports
powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action open -Port COM15 -Baud 115200
powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action write -Hex "41 54 0D 0A"
powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action read -Since -1   # -1 = 取缓冲尾部
powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action status
powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action selftest        # 无需硬件
```

> `selftest` 是为了**没有串口设备也能验证链路**（枚举 → 打开 → 收 → 读）而留的：它把
> `00 01 02 … FF` 循环灌 5000 字节进接收环形缓冲，页面刷新轮询就能把这段数据拉走。
> 校验和、编码、CR 语义这些纯逻辑另有 `_ref/test-serial.js` 覆盖，不需要接硬件。

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

串口相关（同一个进程、另一套后端）：

| 接口 | 说明 |
| --- | --- |
| `GET /api/serial/ports` | 列出本机全部 COM 口（`port` / `name` 友好名 / `vid` / `pid` / `inUse`） |
| `POST /api/serial/open` | body `{"port":"COM15","baud":115200,"dataBits":8,"parity":"none","stopBits":1,"flow":"none","dtr":true,"rts":true}` |
| `POST /api/serial/close` | 关闭当前串口 |
| `POST /api/serial/write` | body `{"hex":"41 54 0D 0A","n":4}`（`n` 供对账，以 `hex` 为准） |
| `GET /api/serial/read?since=N` | 取**自绝对计数 N 之后**收到的字节：`{ok,n,next,total,rx}`；`since=-1` 取缓冲尾部 |
| `GET /api/serial/status` | 当前端口 / 参数 / 收发字节数 / 最近错误 |

`since` 是**绝对累计计数**（不是缓冲区下标），所以页面只要记住 `next` 就能无缝续读，
环形缓冲被覆盖也不会错位。接收走 `SerialPort.DataReceived` → 后台线程写环形缓冲，
stdin 由另一条后台线程读入队列，主循环保持单线程，因此 stdout 的 JSON 行不会交错。

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

## 7. 串口调试（COM 口）

### 7.1 两种模式的区别

页面顶部有一个「普通模式 / 终端模式」分段开关，切换后**整页的布局都换掉**（不是只换一个小控件），
所以一眼能看出当前在哪一种：

| | 普通模式 | 终端模式 |
| --- | --- | --- |
| 布局 | 上半发送区（编码 / 行结尾 / 定时发送 / 预设按钮），下半接收区 | 一整块深色「屏幕」+ 底部命令行，收发混在一起 |
| 接收显示 | 视图可选 **文本 / HEX / HEXDUMP**，可带时间戳、可只显示可见字符 | 按真实终端语义解释控制字符 |
| CR (`0x0D`) | 显示成可见的 `\r`（避免「看着是空行其实有回车」） | 光标回行首，后续字符**覆盖**当前行 |
| 典型用途 | 看协议报文、比对 HEX、抓日志 | 跟设备的命令行 / shell 交互（AT、uboot、Linux console） |

终端模式的核心是 `SERIAL.termFeed()`，它把字节流解释成一块「屏幕」而不是一份日志：

```
设备发出  1 2 3 \r 6 7        屏幕变成 "673"（光标停在列 2，残留的 3 还在）
再发      A T                 屏幕变成 "67AT"（不是追加，是覆盖）
```

这正是 PuTTY / minicom 的行为，也是设备刷新进度条（`Progress: 10%\rProgress: 20%`）
能被正确显示而不是刷出一堆重复行的原因。此外 `LF` 换行、`BS` 删除上一个字符、`TAB` 对齐到
8 列、`BEL` / `FF` 不显示。

**ANSI 颜色会真正渲染出来**（不是把 `[1;32m` 当文本打出来）：终端内部是「带样式的单元格」
模型，`termFeed` 内置一个跨分包安全的转义状态机——

- **SGR（`ESC[…m`）**：前景 30–37 / 90–97、背景 40–47 / 100–107、256 色（`38;5;n`）、
  真彩（`38;2;r;g;b`）、加粗 / 变暗 / 斜体 / 下划线 / 反显及其复位，`0` 全复位；
- **擦除与光标**：`ED(J)` 清屏、`EL(K)` 清行、光标上下左右（`A B C D E F G d`）、
  绝对定位（`H f`，缺行自动补）、保存 / 恢复光标（`ESC 7/8`、`CSI s/u`）；
- **被吞掉**：OSC（窗口标题等，`ESC ] … BEL/ST`）、字符集指示（`ESC ( B` 等）、其它 CSI。

相同样式的相邻字符在渲染时合并成一个 `<span>`（内联 CSS，深色终端底专用调色板），
转义序列被串口分包截断时（`ESC` 在上一帧、参数在这一帧）由 `st.esc` 状态续上。
`SERIAL.termHTML()` 返回已转义可直接 `innerHTML` 的 HTML，`termText()` 仍是纯文本。

**普通模式会自动嗅探**：一段数据里若出现 ANSI 转义序列、**裸 CR**（后面不跟 LF）、`BEL`、
`BS`、`FF`，页面就在接收区上方提示「这段像终端输出，建议切到终端模式」，并给出命中的理由。
识别逻辑是纯函数 `SERIAL.sniffMode(bytes)`，可以单独调用。

### 7.2 切到本页就会列出已连接的 COM 口

进入页面（点击导航或 `?tab=serial` 深链）时会自动枚举一次；「刷新」按钮可手工再来一次。
按传输方式不同，结果差别很大：

| | 本地桥接（推荐） | Web Serial（浏览器直连） |
| --- | --- | --- |
| 能看到的串口 | **本机全部 COM 口** | **只有你授权过的那几个** |
| COM 号 | 有（`COM15`） | **没有**，只给 VID/PID |
| 友好名 | 有（WMI 补 `USB-SERIAL CH340` 这类名字） | 无 |
| 可用页面 | `file://` / `http://127.0.0.1` / https | 仅 https 或 localhost |
| 1.5 位停止位 | 支持 | **不支持**（自动降级为 2 位并告警） |
| mark / space 校验 | 支持 | **不支持**（自动降级为无校验并告警） |
| XON/XOFF 软件流控 | 支持 | **不支持**（自动降级为无流控并告警） |
| 需要装东西 | 需要一个 Node 进程（零 npm 依赖） | 不需要 |

枚举结果里点某个口会显示它的 VID/PID 与友好名；页面还会把**上次用过的口**记在
`localStorage` 里，下次进页面自动选回（先认 `COM` 号，认不出再退而认 VID/PID —— 换 USB 口
导致 COM 号漂移时仍然能对上）。

> 「设备已连接」在本机表现为：Windows 的设备管理器里能看到该 COM 口。桥接用
> `SerialPort.GetPortNames()` 拿**真实存在的串口**，再用 WMI `Win32_PnPEntity` 补上友好名与
> VID/PID；虚拟串口（蓝牙、USB 转串口的空槽位）也会列出来，打开失败时才报错。

### 7.3 离线 / 没有硬件时能验证什么

- 打开 `index.html?tab=serial`（或线上页面）→ 页面会明确告诉你：桥接没跑、Web Serial 此时
  也不可用（`file://` 下浏览器不给 Web Serial 权限），并把「怎么跑起来」的命令写在提示里。
- 跑起桥接后，即使**手上没有串口设备**也能用 `-Action selftest` 灌一段递增字节，
  验证「页面的轮询 → 显示 → 终端语义」整条链路。
- 所有纯逻辑（编解码、HEXDUMP、终端缓冲、嗅探、端口合并与匹配、两个适配器的成功/失败/断开
  路径）都由 `_ref/test-serial.js` 覆盖，用一个假的 `fetch` / 假 `navigator.serial` 跑，
  不需要任何真实硬件。
- `_ref/_e2e-serial.js` 是**真机端到端**：自己起一个真桥接进程，走完
  `ping → ports → open → write → read → close → reopen → status → monitors`，
  验证静态资源能被正确托管，最后杀掉进程。手上有串口设备时跑一遍最放心
  （没有设备也能跑，会自动跳过 open 之后的部分）。

> **一个踩过的坑，值得记一笔**：`SerialPort.Close()` 会等它自己的事件循环线程退出，而那个
> 线程正在 `DataReceived` 回调里等我们自己那把锁 —— **持锁关闭就是自己等自己**。
> 空闲串口上完全测不出来，只有接上一台**一直在吐数据**的设备才会 100% 卡死
> （桥接侧表现为 15 s 超时后重启助手进程）。修法是：接收环形缓冲与生命周期各用一把锁，
> 并且 `Close()` 一律在锁外调用。`_ref/_e2e-serial.js` 里那条
> 「close succeeds while the device is still streaming」就是它的守卫。

### 7.4 已知限制

- **Web Serial 拿不到 COM 号**，这是 API 本身的限制（只给 `usbVendorId` / `usbProductId`），
  所以想按 COM 号认设备请用本地桥接。
- 浏览器直接开 `file://` 时 **Web Serial 一定不可用**（需要 secure context），只有桥接这条路。
- 页面**不能**收发中继/断线自动重连之外的底层操作：DTR/RTS 在 Web Serial 上依赖平台支持，
  部分系统调用 `setSignals` 会失败（页面会忽略这个失败，不影响收发）。
- 高速率下轮询间隔是 40 ms、单次最多取走系统缓冲里的全部字节；用 2 Mbaud 持续灌数据时
  显示会明显滞后于真实串口（这是浏览器的渲染瓶颈，不是丢数据——环形缓冲有 1 MB）。

---

## 8. 复用引擎（二次开发）

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
| `SERIAL` | `bytes`、`hex`、`hex2`、`hex4`、`concat`、`textToBytes`、`decodeBytes`、`eolBytes`、`eolLabel`、`printable`、`escapeText`、`hexdump`、`describeBytes`、`termNew`、`termFeed`、`termText`、`termSize`、`termHTML`（终端缓冲与 ANSI 颜色渲染）、`sniffMode`（内容嗅探）、`stamp`、`bridgePort`、`webPort`、`mergePortLists`、`matchPort`、`transportOrder`、`transportName`、`normalizeCfg`、`toWebSerialOptions`、`toBridgeArgs`、`presetBytes`、`makeWebSerialTransport`、`makeBridgeTransport` |
| `SERIALData` | `BAUDS`、`DATA_BITS`、`PARITY`、`STOP_BITS`、`FLOW`、`EOL`、`SEND_ENCODING`、`RECV_ENCODING`、`RX_VIEWS`、`PRESETS`（AT / SCPI / 控制字符）、`WEB_SERIAL_LIMITS` |

两个传输适配器（`makeBridgeTransport` / `makeWebSerialTransport`）对外是同一组方法，
所以换传输不用改调用方：

```js
<script src="js/serial-data.js"></script>
<script src="js/serial.js"></script>
<script>
  // 桥接：一个进程同时提供 DDC 与串口，base 可指向任意回环端口
  var t = SERIAL.makeBridgeTransport({ base: 'http://127.0.0.1:8760' });
  t.list().then(function (r) { console.log(r.ports.map(function (p) { return p.label; })); });
  t.on('data', function (bytes) { console.log(SERIAL.hex(bytes)); });
  t.open({ port: 'COM15', baud: 115200 });          // 参数经 toBridgeArgs 落到 ps1
  t.write(SERIAL.bytes('41 54 0D 0A'));

  // 终端语义：把字节流解释成一块「屏幕」
  var st = SERIAL.termNew();
  SERIAL.termFeed(st, '123\r67');  SERIAL.termText(st);   // '673'
  SERIAL.termFeed(st, 'AT');       SERIAL.termText(st);   // '67AT'（覆盖不是追加）

  // 这段数据像不像终端输出？
  SERIAL.sniffMode(SERIAL.bytes('1B 5B 32 4A')).mode;     // 'terminal'

  // 换传输时它自己会告警哪些参数被降级
  SERIAL.toWebSerialOptions({ stopBits: 1.5 }).warnings;  // [ '…将按 2 位打开——需要它请改用本地桥接' ]
</script>
```

---

## 9. 自测

> 发布仓库包含 `index.html` + `css/` + `js/` + `data/` + `tools/`，**不含测试脚本**（测试在仓库外的 `_ref/`）。下面两种方式都不需要安装任何第三方包，可随时用来验证引擎是否完好。

### 9.1 Node 里跑一遍（推荐）

引擎文件是普通脚本，用 `vm.runInThisContext` 在同一个全局上下文里依次加载即可（它们靠 `window`/`global` 互相引用，所以**必须共享同一个上下文**）：

```js
// check.js —— 放在 x-macro-lab/ 下，执行：node check.js
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

### 9.2 浏览器控制台里跑一遍

打开页面后按 F12，在控制台直接输入（引擎已挂在 `window` 上）：

```js
Object.keys(EDIDEncoder.FORMAT_PRESETS).map(k => {
  const m = EDIDEncoder.defaultModel();
  EDIDEncoder.FORMAT_PRESETS[k].apply(m);
  const v = EDIDValidator.validate(EDIDEncoder.encode(m).bytes);
  return k + ' → ' + v.status + ' / err=' + v.errors.length;
});
```

### 9.3 界面层

界面（`app.js`）依赖真实 DOM，需要 [jsdom](https://www.npmjs.com/package/jsdom) 才能自动化。jsdom **不是**项目依赖，装在目录之外即可，避免污染这个纯静态仓库：

```bash
mkdir /tmp/edid-domtest && cd /tmp/edid-domtest && npm install jsdom
NODE_PATH=/tmp/edid-domtest/node_modules node your-dom-test.js
```

Windows 上把 `NODE_PATH` 换成 `C:\...\edid-domtest\node_modules` 即可。

> 本项目的测试脚本（`_ref/test-*.js`，覆盖编解码往返、时序矩阵、报告层、时序对比、伽马、
> DDC/CI 协议、串口协议与传输适配器、以及 jsdom 驱动的界面层）都在仓库外的 `_ref/`，
> 不会随静态站点发布。
> 当前基线：**108 / 356 / 2094 / 20095 / 122 / 258 / 269 + 界面 83，全部 0 失败**
> （依次为 `test-edid` / `test-timing` / `test-render` / `test-vtc` / `test-gamma` /
> `test-mccs` / `test-serial`，最后是 `test-app-dom`）。

---

## 10. 已知边界

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

- **串口调试**页同样受浏览器限制：`file://` 下 Web Serial 一定不可用（需要 secure context），
  只有本地桥接这条路；桥接的串口后端只在 Windows 可用（`System.IO.Ports` 来自 PowerShell 自带的
  .NET，无需安装）。Linux / macOS 上目前只能走 Web Serial（Chrome/Edge + localhost）。
- Web Serial **拿不到 COM 号**，只给 VID/PID；想按 COM 号认设备、或需要 1.5 位停止位 /
  mark·space 校验 / XON/XOFF 时，必须用桥接（页面会把这些降级逐条告警出来）。
- 同一个串口**同一时间只能被一个程序打开**（串口是独占资源）。被串口助手 / 烧录工具 / IDE 的
  串口监视器占用时，打开会失败并提示「可能已被其他程序占用」，先关掉对方再试。
- 串口调试页的吞吐上限来自浏览器渲染：40 ms 轮询、界面按帧合并重绘，高波特率持续灌数据时
  显示会滞后于真实串口（数据本身不丢，桥接侧有 1 MB 环形缓冲，缓冲区被写满时才丢弃最旧的字节）。

---

## 11. 说明

本项目的代码与文案为独立实现，功能对标 edidcraft.com。「时序对比」页的功能对标 Tom Verbeure 的
Video Timings Calculator（其 DMT/VIC 标准时序数据与 CVT 公式来自 VESA/CTA 公开规范，算法经交叉验证对齐）。
「伽马验证」页为内部 Python 版「Gamma Curve Verification Tool」的 Web 移植，数据读取、列/行配置与
平均 Gamma 算法与原工具保持一致；内置数据集即该工具配套的 CA410 实测样本（`data/` 目录，可下载）。
EDID / CEA-861 / DisplayID / CVT / GTF 的具体细节请以 VESA 与 CTA 官方规范为准。
