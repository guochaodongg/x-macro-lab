/* =============================================================================
 * serial-data.js — 串口调试页的纯数据表（无逻辑、不碰 DOM）
 *
 *   BAUDS / DATA_BITS / PARITY / STOP_BITS / FLOW   打开串口时的可选参数
 *   EOL                                            行结尾（发送时追加）
 *   SEND_ENCODING                                  发送编码（UTF-8 / 逐字节 ASCII）
 *   RECV_ENCODING                                  接收解码（UTF-8 / GBK / Latin-1）
 *   RX_VIEWS                                       普通模式的接收视图
 *   PRESETS                                        常用指令预设（点击即发）
 *   WEB_SERIAL_LIMITS                              浏览器直连的能力边界（用于提示）
 * ========================================================================== */
(function () {
  'use strict';

  window.SERIALData = {
    /* 常用波特率（含厂商调试常见的 1500000 / 2000000） */
    BAUDS: [300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 76800,
      115200, 128000, 230400, 256000, 460800, 500000, 921600, 1000000, 1500000, 2000000],

    DATA_BITS: [5, 6, 7, 8],

    PARITY: [
      { v: 'none', zh: '无校验 (None)' },
      { v: 'even', zh: '偶校验 (Even)' },
      { v: 'odd', zh: '奇校验 (Odd)' },
      { v: 'mark', zh: '标记 (Mark)' },
      { v: 'space', zh: '空格 (Space)' }
    ],

    STOP_BITS: [
      { v: 1, zh: '1 位' },
      { v: 1.5, zh: '1.5 位' },
      { v: 2, zh: '2 位' }
    ],

    FLOW: [
      { v: 'none', zh: '无流控' },
      { v: 'rtscts', zh: '硬件流控 RTS/CTS' },
      { v: 'xonxoff', zh: '软件流控 XON/XOFF' }
    ],

    EOL: [
      { v: 'crlf', zh: 'CR LF  (0D 0A)  多数 AT / 设备命令行' },
      { v: 'lf', zh: 'LF  (0A)  Unix / SCPI' },
      { v: 'cr', zh: 'CR  (0D)  部分老设备' },
      { v: 'none', zh: '不追加' }
    ],

    SEND_ENCODING: [
      { v: 'utf-8', zh: 'UTF-8（中文按多字节发送）' },
      { v: 'latin1', zh: 'ASCII / Latin-1（每字符 1 字节）' }
    ],

    RECV_ENCODING: [
      { v: 'utf-8', zh: 'UTF-8' },
      { v: 'gbk', zh: 'GBK / GB2312（中文设备日志）' },
      { v: 'latin1', zh: 'Latin-1（逐字节，绝不丢字）' }
    ],

    RX_VIEWS: [
      { v: 'text', zh: '文本' },
      { v: 'hex', zh: 'HEX' },
      { v: 'dump', zh: 'HEXDUMP（偏移 + ASCII）' }
    ],

    /* 点击即发的常用指令。text 走编码 + 行结尾；hex 直接发原始字节。 */
    PRESETS: [
      {
        g: '通用指令', items: [
          { name: 'AT', text: 'AT', eol: 'crlf' },
          { name: 'ATI', text: 'ATI', eol: 'crlf' },
          { name: 'AT+RST', text: 'AT+RST', eol: 'crlf' },
          { name: 'AT+GMR', text: 'AT+GMR', eol: 'crlf' },
          { name: 'help', text: 'help', eol: 'crlf' },
          { name: 'version', text: 'version', eol: 'crlf' }
        ]
      },
      {
        g: 'SCPI / 仪器', items: [
          { name: '*IDN?', text: '*IDN?', eol: 'lf' },
          { name: '*RST', text: '*RST', eol: 'lf' },
          { name: 'SYST:ERR?', text: 'SYST:ERR?', eol: 'lf' },
          { name: 'MEAS:VOLT:DC?', text: 'MEAS:VOLT:DC?', eol: 'lf' }
        ]
      },
      {
        g: '控制字符', items: [
          { name: 'CR', hex: '0D', title: '回车 0x0D' },
          { name: 'LF', hex: '0A', title: '换行 0x0A' },
          { name: 'CR LF', hex: '0D 0A' },
          { name: 'ESC', hex: '1B', title: '0x1B，常用来打断当前命令' },
          { name: 'Ctrl+C', hex: '03', title: '0x03，多数 CLI 用它终止当前任务' },
          { name: 'Ctrl+Z', hex: '1A', title: '0x1A' },
          { name: 'BS', hex: '08', title: '退格 0x08' },
          { name: 'BEL', hex: '07', title: '响铃 0x07' },
          { name: 'TAB', hex: '09' }
        ]
      }
    ],

    /* 浏览器直连（Web Serial）不支持的东西——界面据此给出「请改用桥接」的提示 */
    WEB_SERIAL_LIMITS: {
      parity: ['mark', 'space'],
      stopBits: [1.5],
      flow: ['xonxoff'],
      note: '浏览器只暴露「已授权过」的串口，也拿不到 COM 号；要看完整的 COM 口列表请用本地桥接。'
    }
  };
})();
