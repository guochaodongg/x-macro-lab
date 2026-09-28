<#
  ddc-windows.ps1 -- send DDC/CI (MCCS) commands to monitors on Windows.

  Uses dxva2.dll (the same API Windows' display settings use internally):
    EnumDisplayMonitors / GetMonitorInfo
    GetNumberOfPhysicalMonitorsFromHMONITOR / GetPhysicalMonitorsFromHMONITOR
    GetVCPFeatureAndVCPFeatureReply / SetVCPFeature
    GetCapabilitiesStringLength / CapabilitiesRequestAndCapabilitiesReply

  Usage (one shot):
    powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action list
    powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action get -Monitor 0 -Code 0x10
    powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action set -Monitor 0 -Code 0x10 -Value 80
    powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action caps -Monitor 0

  Usage (server mode, used by ddc-bridge.js -- Add-Type compiles only once):
    powershell -ExecutionPolicy Bypass -File ddc-windows.ps1 -Action serve
    stdin commands, one per line, each answered by one JSON line:
      list | get <monitor> <codeHex> | set <monitor> <codeHex> <value> |
      caps <monitor> | ping | quit

  Every response is a single JSON object: {"ok":true,...} or {"ok":false,"error":"..."}

  NOTE: this file is intentionally ASCII-only so Windows PowerShell 5.1 parses it
  correctly regardless of the console code page.
#>
[CmdletBinding()]
param(
  [ValidateSet('list', 'get', 'set', 'caps', 'save', 'serve')]
  [string]$Action = 'list',
  [int]$Monitor = 0,
  [int]$Code = 0x10,
  [int]$Value = 0
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$csSource = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class DdcWindows
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct PHYSICAL_MONITOR
    {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string szPhysicalMonitorDescription;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int left, top, right, bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct MONITORINFOEX
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string szDevice;
    }

    private delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdc, ref RECT lprcMonitor, IntPtr dwData);

    [DllImport("user32.dll")]
    private static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumProc lpfnEnum, IntPtr dwData);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFOEX lpmi);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, ref uint pdwNumberOfPhysicalMonitors);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, uint dwPhysicalMonitorArraySize, [Out] PHYSICAL_MONITOR[] pPhysicalMonitorArray);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool DestroyPhysicalMonitor(IntPtr hMonitor);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool GetVCPFeatureAndVCPFeatureReply(IntPtr hMonitor, byte bVCPCode, out uint pvct, out uint pdwCurrentValue, out uint pdwMaximumValue);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool SetVCPFeature(IntPtr hMonitor, byte bVCPCode, uint dwNewValue);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool GetCapabilitiesStringLength(IntPtr hMonitor, ref uint pdwCapabilitiesStringLengthInCharacters);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool CapabilitiesRequestAndCapabilitiesReply(IntPtr hMonitor, [MarshalAs(UnmanagedType.LPStr)] StringBuilder pszASCIICapabilitiesString, uint dwCapabilitiesStringLengthInCharacters);

    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool SaveCurrentMonitorSettings(IntPtr hMonitor);

    public class Physical
    {
        public IntPtr handle;
        public string device;
        public string desc;
    }

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

    public static string Err(string msg)
    {
        return "{\"ok\":false,\"error\":" + Quote(msg) + "}";
    }

    public static string ErrCode(string msg, int win32)
    {
        return "{\"ok\":false,\"error\":" + Quote(msg) + ",\"win32\":" + win32 + "}";
    }

    private static List<IntPtr> HMonitors()
    {
        List<IntPtr> list = new List<IntPtr>();
        MonitorEnumProc cb = delegate(IntPtr hMon, IntPtr hdc, ref RECT r, IntPtr d) { list.Add(hMon); return true; };
        if (!EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, cb, IntPtr.Zero))
            throw new Exception("EnumDisplayMonitors failed");
        GC.KeepAlive(cb);
        return list;
    }

    private static string DeviceName(IntPtr hMon)
    {
        MONITORINFOEX mi = new MONITORINFOEX();
        mi.cbSize = Marshal.SizeOf(typeof(MONITORINFOEX));
        if (GetMonitorInfo(hMon, ref mi)) return mi.szDevice;
        return "";
    }

    private static List<Physical> Physicals()
    {
        List<Physical> outList = new List<Physical>();
        List<IntPtr> hmons = HMonitors();
        for (int k = 0; k < hmons.Count; k++)
        {
            IntPtr hMon = hmons[k];
            uint n = 0;
            if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, ref n) || n == 0) continue;
            PHYSICAL_MONITOR[] arr = new PHYSICAL_MONITOR[n];
            if (!GetPhysicalMonitorsFromHMONITOR(hMon, n, arr)) continue;
            string dev = DeviceName(hMon);
            for (uint i = 0; i < n; i++)
            {
                Physical p = new Physical();
                p.handle = arr[i].hPhysicalMonitor;
                p.desc = arr[i].szPhysicalMonitorDescription;
                p.device = dev;
                outList.Add(p);
            }
        }
        return outList;
    }

    private static void DestroyAll(List<Physical> list)
    {
        for (int i = 0; i < list.Count; i++)
        {
            try { DestroyPhysicalMonitor(list[i].handle); } catch { }
        }
    }

    public static string List()
    {
        List<Physical> list = Physicals();
        try
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("{\"ok\":true,\"count\":").Append(list.Count).Append(",\"monitors\":[");
            for (int i = 0; i < list.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append("{\"index\":").Append(i)
                  .Append(",\"device\":").Append(Quote(list[i].device))
                  .Append(",\"description\":").Append(Quote(list[i].desc))
                  .Append('}');
            }
            sb.Append("]}");
            return sb.ToString();
        }
        finally { DestroyAll(list); }
    }

    public static string Get(int index, int code)
    {
        List<Physical> list = Physicals();
        try
        {
            if (list.Count == 0) return Err("no physical monitor found (is a display attached?)");
            if (index < 0 || index >= list.Count) return Err("monitor index out of range (found " + list.Count + ")");
            Physical p = list[index];
            uint vct = 0, cur = 0, max = 0;
            bool ok = GetVCPFeatureAndVCPFeatureReply(p.handle, (byte)code, out vct, out cur, out max);
            if (!ok)
            {
                int e = Marshal.GetLastWin32Error();
                return ErrCode("GetVCPFeatureAndVCPFeatureReply failed for VCP 0x" + code.ToString("X2") +
                           " (Win32 error " + e + ")", e);
            }
            return "{\"ok\":true,\"monitor\":" + index +
                   ",\"code\":" + code +
                   ",\"vcpType\":" + vct +
                   ",\"current\":" + cur +
                   ",\"max\":" + max +
                   ",\"description\":" + Quote(p.desc) + "}";
        }
        finally { DestroyAll(list); }
    }

    public static string Set(int index, int code, int value)
    {
        List<Physical> list = Physicals();
        try
        {
            if (list.Count == 0) return Err("no physical monitor found (is a display attached?)");
            if (index < 0 || index >= list.Count) return Err("monitor index out of range (found " + list.Count + ")");
            Physical p = list[index];
            bool ok = SetVCPFeature(p.handle, (byte)code, (uint)value);
            if (!ok)
            {
                int e = Marshal.GetLastWin32Error();
                return ErrCode("SetVCPFeature failed for VCP 0x" + code.ToString("X2") + " value " + value +
                           " (Win32 error " + e + ")", e);
            }
            return "{\"ok\":true,\"monitor\":" + index + ",\"code\":" + code + ",\"value\":" + value +
                   ",\"description\":" + Quote(p.desc) + "}";
        }
        finally { DestroyAll(list); }
    }

    public static string Save(int index)
    {
        List<Physical> list = Physicals();
        try
        {
            if (list.Count == 0) return Err("no physical monitor found (is a display attached?)");
            if (index < 0 || index >= list.Count) return Err("monitor index out of range (found " + list.Count + ")");
            Physical p = list[index];
            bool ok = SaveCurrentMonitorSettings(p.handle);
            if (!ok)
            {
                int e = Marshal.GetLastWin32Error();
                return ErrCode("SaveCurrentMonitorSettings failed (Win32 error " + e + ")", e);
            }
            return "{\"ok\":true,\"monitor\":" + index + ",\"action\":\"save\",\"description\":" + Quote(p.desc) + "}";
        }
        finally { DestroyAll(list); }
    }

    public static string Capabilities(int index)
    {
        List<Physical> list = Physicals();
        try
        {
            if (list.Count == 0) return Err("no physical monitor found (is a display attached?)");
            if (index < 0 || index >= list.Count) return Err("monitor index out of range (found " + list.Count + ")");
            Physical p = list[index];
            uint len = 0;
            if (!GetCapabilitiesStringLength(p.handle, ref len) || len == 0)
            {
                int e = Marshal.GetLastWin32Error();
                return ErrCode("GetCapabilitiesStringLength failed (Win32 error " + e + ")", e);
            }
            StringBuilder sb = new StringBuilder((int)len + 1);
            if (!CapabilitiesRequestAndCapabilitiesReply(p.handle, sb, len))
            {
                int e = Marshal.GetLastWin32Error();
                return ErrCode("CapabilitiesRequestAndCapabilitiesReply failed (Win32 error " + e + ")", e);
            }
            return "{\"ok\":true,\"monitor\":" + index + ",\"length\":" + len +
                   ",\"description\":" + Quote(p.desc) +
                   ",\"text\":" + Quote(sb.ToString()) + "}";
        }
        finally { DestroyAll(list); }
    }
}
'@

if (-not ('DdcWindows' -as [type])) {
  Add-Type -TypeDefinition $csSource -Language CSharp | Out-Null
}

function Parse-Code([string]$tok) {
  if ($null -eq $tok) { return 0 }
  $t = $tok.Trim()
  if ($t.StartsWith('0x') -or $t.StartsWith('0X')) { return [Convert]::ToInt32($t.Substring(2), 16) }
  if ($t -match '^[0-9a-fA-F]{1,4}$') { return [Convert]::ToInt32($t, 16) }
  return [Convert]::ToInt32($t, 10)
}

function Invoke-DdcLine([string]$line) {
  $parts = @($line.Trim() -split '\s+' | Where-Object { $_ -ne '' })
  if ($parts.Count -eq 0) { return '{"ok":false,"error":"empty command"}' }
  $cmd = $parts[0].ToLower()
  try {
    switch ($cmd) {
      'ping' { return '{"ok":true,"action":"ping","backend":"dxva2"}' }
      'list' { return [DdcWindows]::List() }
      'get'  {
        $m = if ($parts.Count -gt 1) { [int]$parts[1] } else { 0 }
        $c = if ($parts.Count -gt 2) { Parse-Code $parts[2] } else { 0x10 }
        return [DdcWindows]::Get($m, $c)
      }
      'set'  {
        $m = if ($parts.Count -gt 1) { [int]$parts[1] } else { 0 }
        $c = if ($parts.Count -gt 2) { Parse-Code $parts[2] } else { 0x10 }
        $v = if ($parts.Count -gt 3) { [int]$parts[3] } else { 0 }
        return [DdcWindows]::Set($m, $c, $v)
      }
      'caps' {
        $m = if ($parts.Count -gt 1) { [int]$parts[1] } else { 0 }
        return [DdcWindows]::Capabilities($m)
      }
      'save' {
        $m = if ($parts.Count -gt 1) { [int]$parts[1] } else { 0 }
        return [DdcWindows]::Save($m)
      }
      default { return '{"ok":false,"error":"unknown command (use list|get|set|caps|save|ping|quit)"}' }
    }
  } catch {
    return '{"ok":false,"error":' + [DdcWindows]::Quote($_.Exception.Message) + '}'
  }
}

if ($Action -eq 'serve') {
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.Trim() -eq '') { continue }
    if ($line.Trim().ToLower() -eq 'quit') { [Console]::Out.WriteLine('{"ok":true,"action":"quit"}'); [Console]::Out.Flush(); break }
    $resp = Invoke-DdcLine $line
    [Console]::Out.WriteLine($resp)
    [Console]::Out.Flush()
  }
  exit 0
}

$oneShot = switch ($Action) {
  'list' { 'list' }
  'get'  { 'get ' + $Monitor + ' ' + ('0x{0:x}' -f $Code) }
  'set'  { 'set ' + $Monitor + ' ' + ('0x{0:x}' -f $Code) + ' ' + $Value }
  'caps' { 'caps ' + $Monitor }
  'save' { 'save ' + $Monitor }
}
$result = Invoke-DdcLine $oneShot
[Console]::Out.WriteLine($result)
