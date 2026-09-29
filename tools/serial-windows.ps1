<#
  serial-windows.ps1 -- serial port (COM) backend for the serial debug page.

  Uses System.IO.Ports.SerialPort from the .NET Framework -- nothing to install.
  All threading lives in C# (compiled once by Add-Type):

    * a background thread drains stdin into a queue  -> commands never block RX
    * the DataReceived event appends into a 1 MB ring buffer -> RX never blocks
    * the PowerShell main loop stays single threaded, so stdout lines never
      interleave (one JSON object per line, always)

  Usage (one shot):
    powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action ports
    powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action status

  Usage (server mode, used by ddc-bridge.js):
    powershell -ExecutionPolicy Bypass -File serial-windows.ps1 -Action serve
    stdin commands, one per line, each answered by one JSON line:
      ports | open <port> <baud> <bits> <parity> <stop> <flow> <dtr> <rts> |
      close | write <hex...> | read <since> | status | selftest [n] | ping | quit

  `read <since>` returns the bytes received since the absolute counter <since>:
      {"ok":true,"n":12,"next":1234,"total":1234,"rx":"0D 0A ..."}
    Pass -1 to get the tail of the buffer (used when a client reconnects).

  `selftest [n]` pushes a deterministic byte ramp straight into the RX ring so the
  buffer / delta protocol can be checked with no hardware attached.  It is only
  used by _ref/test-serial.js.

  NOTE: this file is intentionally ASCII-only so Windows PowerShell 5.1 parses it
  correctly regardless of the console code page.  User-facing Chinese hints live
  in ddc-bridge.js.
#>
[CmdletBinding()]
param(
  [ValidateSet('ports', 'open', 'close', 'write', 'read', 'status', 'selftest', 'serve')]
  [string]$Action = 'ports',
  [string]$Port = '',
  [int]$Baud = 115200,
  [int]$DataBits = 8,
  [string]$ParityName = 'none',
  [string]$StopBitsName = '1',
  [string]$Flow = 'none',
  [int]$Dtr = 1,
  [int]$Rts = 1,
  [string]$Hex = '',
  [long]$Since = -1
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$csSource = @'
using System;
using System.Collections.Generic;
using System.IO.Ports;
using System.Text;
using System.Threading;

public class SerialWin
{
    private static SerialPort port;
    private static readonly object gate = new object();     /* 生命周期：port / portName / baudRate / lastError */
    private static readonly object rxLock = new object();   /* 接收环形缓冲：rx / rxTotal
                                                               与 gate 分开，接收事件不会和开关串口互相等 */
    private static readonly object cmdLock = new object();
    private static readonly Queue<string> cmdQ = new Queue<string>();
    private static readonly AutoResetEvent cmdEvt = new AutoResetEvent(false);
    private static byte[] rx = new byte[1 << 20];      /* 1 MB ring, big enough for a burst of logs */
    private static long rxTotal = 0;
    private static long txTotal = 0;
    private static string portName = "";
    private static int baudRate = 0;
    private static string lastError = "";

    /* ------------------------------- JSON ------------------------------- */

    public static string Quote(string s)
    {
        if (s == null) return "\"\"";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            if (c == '"' || c == '\\') { sb.Append('\\'); sb.Append(c); }
            else if (c < ' ') { sb.Append("\\u").Append(((int)c).ToString("x4")); }
            else { sb.Append(c); }
        }
        sb.Append('"');
        return sb.ToString();
    }

    public static string Err(string m) { return "{\"ok\":false,\"error\":" + Quote(m) + "}"; }

    /* ------------------------------- stdin ------------------------------- */

    public static void StartStdin()
    {
        Thread t = new Thread(delegate()
        {
            try
            {
                string line;
                while ((line = Console.In.ReadLine()) != null)
                {
                    lock (cmdLock) { cmdQ.Enqueue(line); }
                    cmdEvt.Set();
                }
            }
            catch (Exception) { }
            lock (cmdLock) { cmdQ.Enqueue(null); }   /* EOF sentinel */
            cmdEvt.Set();
        });
        t.IsBackground = true;
        t.Start();
    }

    public static string ReadCommandLine()
    {
        while (true)
        {
            lock (cmdLock) { if (cmdQ.Count > 0) return cmdQ.Dequeue(); }
            cmdEvt.WaitOne();
        }
    }

    /* ------------------------------- ports ------------------------------- */

    public static string[] PortNames()
    {
        string[] names;
        try { names = SerialPort.GetPortNames(); }
        catch (Exception) { names = new string[0]; }
        Array.Sort(names, delegate(string a, string b) { return PortNum(a) - PortNum(b); });
        return names;
    }

    private static int PortNum(string s)
    {
        if (s == null) return 0;
        StringBuilder d = new StringBuilder();
        for (int i = 0; i < s.Length; i++) if (s[i] >= '0' && s[i] <= '9') d.Append(s[i]);
        int n;
        return int.TryParse(d.ToString(), out n) ? n : 0;
    }

    /* ------------------------------ RX ring ------------------------------ */

    private static void OnData(object sender, SerialDataReceivedEventArgs e)
    {
        try
        {
            SerialPort p = (SerialPort)sender;
            int n = p.BytesToRead;
            if (n <= 0) return;
            byte[] buf = new byte[n];
            int got = p.Read(buf, 0, n);
            if (got <= 0) return;
            AppendRx(buf, got);
        }
        catch (Exception ex) { lock (gate) { lastError = ex.Message; } }
    }

    /* Ring append.  Shared by the DataReceived handler and by Selftest() so the
       buffer logic can be verified without any hardware attached. */
    private static void AppendRx(byte[] buf, int got)
    {
        lock (rxLock)
        {
            long cap = rx.Length;
            for (int i = 0; i < got; i++)
            {
                rx[(int)(rxTotal % cap)] = buf[i];
                rxTotal++;
            }
        }
    }

    /* Inject a deterministic byte ramp -- used by _ref/test-serial.js only. */
    public static string Selftest(int n)
    {
        if (n <= 0) n = 5000;
        byte[] buf = new byte[n];
        for (int i = 0; i < n; i++) buf[i] = (byte)(i & 0xFF);
        AppendRx(buf, n);
        long total;
        lock (rxLock) { total = rxTotal; }
        return "{\"ok\":true,\"injected\":" + n + ",\"total\":" + total + "}";
    }

    public static string ReadSince(long since)
    {
        byte[] data;
        long total;
        lock (rxLock)
        {
            total = rxTotal;
            long cap = rx.Length;
            if (since < 0) since = Math.Max(0, total - 4096);
            if (since < total - cap) since = Math.Max(0, total - cap);
            if (since > total) since = total;
            int n = (int)(total - since);
            data = new byte[n];
            for (int i = 0; i < n; i++) data[i] = rx[(int)((since + i) % cap)];
        }
        return "{\"ok\":true,\"n\":" + data.Length + ",\"next\":" + total +
               ",\"total\":" + total + ",\"rx\":" + Quote(ToHex(data)) + "}";
    }

    public static string Status()
    {
        long rt, tt;
        lock (rxLock) { rt = rxTotal; tt = txTotal; }
        lock (gate)
        {
            return "{\"ok\":true,\"open\":" + (IsOpen() ? "true" : "false") +
                   ",\"port\":" + Quote(portName) + ",\"baud\":" + baudRate +
                   ",\"rx\":" + rt + ",\"tx\":" + tt +
                   ",\"error\":" + Quote(lastError) + "}";
        }
    }

    /* ---------------------------- open / close ---------------------------- */

    public static bool IsOpen()
    {
        lock (gate) { try { return port != null && port.IsOpen; } catch (Exception) { return false; } }
    }

    public static string Open(string name, int baud, int dataBits, string parity, string stop, string flow, bool dtr, bool rts)
    {
        /* 先把上一个口在锁外收掉（见 ClosePort 的说明），再装新的。 */
        CloseInner();
        if (name == null || name.Length == 0) return Err("missing port name");
        SerialPort p = null;
        try
        {
            p = new SerialPort(name, baud, ParseParity(parity), dataBits, ParseStop(stop));
            p.Handshake = ParseFlow(flow);
            p.ReadTimeout = 200;
            p.WriteTimeout = 500;
            p.ReadBufferSize = 8192;
            p.WriteBufferSize = 4096;
            try { p.DtrEnable = dtr; } catch (Exception) { }
            try { p.RtsEnable = rts; } catch (Exception) { }
            p.Open();
            p.DataReceived += OnData;
            /* 计数器归零要在挂上事件之后、发布新 port 之前完成，
               否则刚收到的几个字节会被归零吞掉。 */
            lock (rxLock) { rxTotal = 0; txTotal = 0; }
            lock (gate)
            {
                lastError = "";
                port = p;
                portName = name;
                baudRate = baud;
            }
            return "{\"ok\":true,\"port\":" + Quote(name) + ",\"baud\":" + baud +
                   ",\"dataBits\":" + dataBits + ",\"parity\":" + Quote(parity) +
                   ",\"stopBits\":" + Quote(stop) + ",\"flow\":" + Quote(flow) +
                   ",\"dtr\":" + (dtr ? "true" : "false") + ",\"rts\":" + (rts ? "true" : "false") + "}";
        }
        catch (Exception ex)
        {
            ClosePort(p);
            lock (gate) { lastError = ex.Message; }
            return Err("opening " + name + " failed: " + ex.Message + Hint(ex));
        }
    }

    private static string Hint(Exception ex)
    {
        if (ex is UnauthorizedAccessException)
            return " [port busy: close any serial terminal / flashing tool / IDE serial monitor]";
        if (ex is System.IO.IOException)
            return " [port gone or already in use; check the cable and the device]";
        if (ex is ArgumentException)
            return " [unsupported parameter: non-standard baud rate or stop bits]";
        return "";
    }

    public static string Close()
    {
        CloseInner();
        return "{\"ok\":true,\"closed\":true}";
    }

    /* 换口 / 关闭：先把 port 从字段上摘下来（锁内只做这一步），再在锁外真正关闭。
       ── 为什么不能在持 gate 时 Close() ──────────────────────────────────
       SerialPort.Close() 要等它自己的事件循环线程退出，而那个线程正在
       OnData 里等 gate —— 持锁关闭就是自己等自己，必然死锁。
       实测：COM15 上接了一台一直在吐日志的设备，持锁关闭 100% 超时
       （空闲口测不出来，所以这个 bug 只在真设备上才暴露）。 */
    private static void CloseInner()
    {
        SerialPort p;
        lock (gate)
        {
            p = port;
            port = null;
            portName = "";
            baudRate = 0;
        }
        ClosePort(p);
    }

    private static void ClosePort(SerialPort p)
    {
        if (p == null) return;
        try { p.DataReceived -= OnData; } catch (Exception) { }
        /* ReadTimeout=200，所以即便事件线程正卡在 Read 上也会很快返回；
           再加一层限时等待，绝不把主循环挂死在一个坏掉的句柄上。 */
        try
        {
            Thread t = new Thread(delegate () { try { p.Close(); } catch (Exception) { } try { p.Dispose(); } catch (Exception) { } });
            t.IsBackground = true;
            t.Start();
            t.Join(4000);
        }
        catch (Exception)
        {
            try { p.Dispose(); } catch (Exception) { }
        }
    }

    /* ------------------------------- write ------------------------------- */

    public static string WriteHex(string hexIn)
    {
        byte[] data = FromHex(hexIn);
        if (data == null || data.Length == 0) return Err("no bytes to send");
        /* 取一次快照再用：关串口会把 port 置空，不能一边判一边用。 */
        SerialPort p;
        lock (gate) { p = port; }
        if (p == null || !IsOpen()) return Err("port is not open");
        try { p.Write(data, 0, data.Length); }
        catch (Exception ex) { lock (gate) { lastError = ex.Message; } return Err("write failed: " + ex.Message); }
        long tt;
        lock (rxLock) { txTotal += data.Length; tt = txTotal; }
        return "{\"ok\":true,\"n\":" + data.Length + ",\"tx\":" + tt + "}";
    }

    /* ------------------------------ helpers ------------------------------ */

    public static string ToHex(byte[] d)
    {
        if (d == null || d.Length == 0) return "";
        StringBuilder sb = new StringBuilder(d.Length * 3);
        for (int i = 0; i < d.Length; i++)
        {
            if (i > 0) sb.Append(' ');
            sb.Append(d[i].ToString("X2"));
        }
        return sb.ToString();
    }

    private static byte[] FromHex(string s)
    {
        if (s == null) return null;
        StringBuilder sb = new StringBuilder(s.Length);
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) sb.Append(c);
        }
        string t = sb.ToString();
        if (t.Length % 2 == 1) t = t.Substring(0, t.Length - 1);
        byte[] outb = new byte[t.Length / 2];
        for (int i = 0; i < outb.Length; i++)
        {
            try { outb[i] = Convert.ToByte(t.Substring(i * 2, 2), 16); }
            catch (Exception) { return null; }
        }
        return outb;
    }

    private static Parity ParseParity(string p)
    {
        switch ((p == null ? "none" : p).ToLower())
        {
            case "even": return Parity.Even;
            case "odd": return Parity.Odd;
            case "mark": return Parity.Mark;
            case "space": return Parity.Space;
            default: return Parity.None;
        }
    }

    private static StopBits ParseStop(string s)
    {
        switch ((s == null ? "1" : s.ToLower()))
        {
            case "2": return StopBits.Two;
            case "1.5": return StopBits.OnePointFive;
            default: return StopBits.One;
        }
    }

    private static Handshake ParseFlow(string f)
    {
        switch ((f == null ? "none" : f).ToLower())
        {
            case "rtscts": return Handshake.RequestToSend;
            case "xonxoff": return Handshake.XOnXOff;
            default: return Handshake.None;
        }
    }
}
'@

if (-not ('SerialWin' -as [type])) {
  Add-Type -TypeDefinition $csSource -Language CSharp -ReferencedAssemblies 'System.dll', 'System.Core.dll' | Out-Null
}

function Esc-Json([string]$s) {
  if ($null -eq $s) { return '' }
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $c = [int]$ch
    if ($ch -eq '"') { [void]$sb.Append('\"') }
    elseif ($ch -eq '\') { [void]$sb.Append('\\') }
    elseif ($c -lt 32) { [void]$sb.Append('\u' + $c.ToString('x4')) }
    else { [void]$sb.Append($ch) }
  }
  return $sb.ToString()
}

function Out-Json([string]$s) {
  [Console]::Out.WriteLine($s)
  [Console]::Out.Flush()
}

<#
  List every COM port the system knows about, enriched with the friendly name and
  VID/PID from WMI.  GetPortNames() decides which ports exist (it also sees
  virtual ones WMI may not list); WMI only supplies the human readable bits.
#>
function Get-SerialPortsJson {
  $names = @()
  try { $names = @([SerialWin]::PortNames()) } catch { }
  $meta = @{}
  try {
    $pnp = @(Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction Stop |
      Where-Object { ($_.Name -match '\(COM\d+\)') -or ($_.Caption -match '\(COM\d+\)') })
    foreach ($d in $pnp) {
      $text = if ($d.Name) { $d.Name } else { $d.Caption }
      if (-not $text) { continue }
      $m = [regex]::Match($text, '\((COM\d+)\)', 'IgnoreCase')
      if (-not $m.Success) { continue }
      $com = $m.Groups[1].Value.ToUpper()
      if ($meta.ContainsKey($com)) { continue }
      $friendly = $text.Substring(0, $m.Index).Trim()
      $vid = ''
      $pidHex = ''
      if ($d.PNPDeviceID) {
        $v = [regex]::Match($d.PNPDeviceID, 'VID_([0-9A-Fa-f]{4})')
        $q = [regex]::Match($d.PNPDeviceID, 'PID_([0-9A-Fa-f]{4})')
        if ($v.Success) { $vid = $v.Groups[1].Value.ToUpper() }
        if ($q.Success) { $pidHex = $q.Groups[1].Value.ToUpper() }
      }
      $meta[$com] = @{ name = $friendly; vid = $vid; pid = $pidHex }
    }
  } catch { }
  foreach ($k in @($meta.Keys)) {
    if ($names -notcontains $k) { $names += $k }
  }
  $names = @($names | Sort-Object { [int]([regex]::Match($_, '\d+').Value) })
  $items = @()
  foreach ($n in $names) {
    $up = ([string]$n).ToUpper()
    $nm = ''
    $vid = ''
    $pidHex = ''
    if ($meta.ContainsKey($up)) {
      $nm = [string]$meta[$up].name
      $vid = [string]$meta[$up].vid
      $pidHex = [string]$meta[$up].pid
    }
    $items += '{"port":"' + $up + '","name":"' + (Esc-Json $nm) + '","vid":"' + $vid +
      '","pid":"' + $pidHex + '","inUse":false}'
  }
  $note = ''
  if ($items.Count -eq 0) { $note = 'no COM port found on this machine' }
  return '{"ok":true,"count":' + $items.Count + ',"note":"' + (Esc-Json $note) +
    '","ports":[' + ($items -join ',') + ']}'
}

function Invoke-SerialLine([string]$line) {
  $parts = @($line.Trim() -split '\s+' | Where-Object { $_ -ne '' })
  if ($parts.Count -eq 0) { return '{"ok":false,"error":"empty command"}' }
  $cmd = $parts[0].ToLower()
  try {
    switch ($cmd) {
      'ping' { return '{"ok":true,"action":"ping","backend":"serial","platform":"win32"}' }
      'ports' { return Get-SerialPortsJson }
      'open' {
        $name = if ($parts.Count -gt 1) { [string]$parts[1] } else { '' }
        $b = if ($parts.Count -gt 2) { [int]$parts[2] } else { 115200 }
        $bits = if ($parts.Count -gt 3) { [int]$parts[3] } else { 8 }
        $par = if ($parts.Count -gt 4) { [string]$parts[4] } else { 'none' }
        $stop = if ($parts.Count -gt 5) { [string]$parts[5] } else { '1' }
        $flow = if ($parts.Count -gt 6) { [string]$parts[6] } else { 'none' }
        $dtr = if ($parts.Count -gt 7) { $parts[7] -ne '0' } else { $true }
        $rts = if ($parts.Count -gt 8) { $parts[8] -ne '0' } else { $true }
        if (-not $name) { return '{"ok":false,"error":"missing port name"}' }
        return [SerialWin]::Open($name, $b, $bits, $par, $stop, $flow, $dtr, $rts)
      }
      'close' { return [SerialWin]::Close() }
      'write' {
        $hx = ''
        if ($parts.Count -gt 1) { $hx = ($parts[1..($parts.Count - 1)] -join '') }
        return [SerialWin]::WriteHex($hx)
      }
      'read' {
        $since = if ($parts.Count -gt 1) { [long]$parts[1] } else { -1 }
        return [SerialWin]::ReadSince($since)
      }
      'status' { return [SerialWin]::Status() }
      'selftest' {
        $n = if ($parts.Count -gt 1) { [int]$parts[1] } else { 5000 }
        return [SerialWin]::Selftest($n)
      }
      default { return '{"ok":false,"error":"unknown command (use ports|open|close|write|read|status|selftest|ping|quit)"}' }
    }
  } catch {
    return '{"ok":false,"error":' + (Esc-Json $_.Exception.Message) + '}'
  }
}

if ($Action -eq 'serve') {
  [SerialWin]::StartStdin()
  while ($true) {
    $line = [SerialWin]::ReadCommandLine()
    if ($null -eq $line) { break }
    if ($line.Trim() -eq '') { continue }
    if ($line.Trim().ToLower() -eq 'quit') {
      [void][SerialWin]::Close()
      Out-Json '{"ok":true,"action":"quit"}'
      break
    }
    Out-Json (Invoke-SerialLine $line)
  }
  exit 0
}

$oneShot = switch ($Action) {
  'ports' { 'ports' }
  'open' { 'open ' + $Port + ' ' + $Baud + ' ' + $DataBits + ' ' + $ParityName + ' ' + $StopBitsName + ' ' + $Flow + ' ' + $Dtr + ' ' + $Rts }
  'close' { 'close' }
  'write' { 'write ' + $Hex }
  'read' { 'read ' + $Since }
  'status' { 'status' }
  'selftest' { 'selftest 5000' }
}
Out-Json (Invoke-SerialLine $oneShot)
