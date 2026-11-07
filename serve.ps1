# Tiny local static server for previewing the portfolio (supports video seeking).
# Usage:  powershell -ExecutionPolicy Bypass -File .\serve.ps1   then open http://localhost:8080
param([int]$Port = 8080)
$root = $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif'; '.webp'='image/webp'; '.svg'='image/svg+xml';
  '.mp4'='video/mp4'; '.webm'='video/webm'; '.mov'='video/quicktime' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Output "Serving $root at http://localhost:$Port/"
while ($l.IsListening) {
  $ctx = $l.GetContext(); $req = $ctx.Request; $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    # booth-studio.html saves its renders here (local dev only, mockup images only)
    if ($req.HttpMethod -eq 'PUT') {
      if ($rel -match '^assets/mockups/(booth|goat|event|lcd)-3d-[\w-]+\.jpg$') {
        $dest = Join-Path $root $rel
        $fsw = [IO.File]::Create($dest); $req.InputStream.CopyTo($fsw); $fsw.Close()
        $res.StatusCode = 201
      } else { $res.StatusCode = 403 }
      $res.Close(); continue
    }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $path.StartsWith($root) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
      # try Unicode-normalized variants of the name
      $alt = [IO.Path]::GetFullPath((Join-Path $root $rel.Normalize([Text.NormalizationForm]::FormD)))
      if ($alt.StartsWith($root) -and (Test-Path -LiteralPath $alt -PathType Leaf)) { $path = $alt } else { $res.StatusCode = 404; $res.Close(); continue }
    }
    $ext = [IO.Path]::GetExtension($path).ToLower()
    $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
    $res.Headers['Accept-Ranges'] = 'bytes'
    $fs = [IO.File]::OpenRead($path); $len = $fs.Length; $start = 0; $end = $len - 1
    $range = $req.Headers['Range']
    if ($range -match 'bytes=(\d*)-(\d*)') {
      if ($matches[1]) { $start = [int64]$matches[1] }
      if ($matches[2]) { $end = [Math]::Min([int64]$matches[2], $len - 1) }
      $res.StatusCode = 206
      $res.Headers['Content-Range'] = "bytes $start-$end/$len"
    }
    $count = $end - $start + 1
    $res.ContentLength64 = $count
    $fs.Seek($start, 'Begin') | Out-Null
    $buf = New-Object byte[] 262144; $left = $count
    while ($left -gt 0) {
      $n = $fs.Read($buf, 0, [Math]::Min($buf.Length, $left)); if ($n -le 0) { break }
      $res.OutputStream.Write($buf, 0, $n); $left -= $n
    }
    $fs.Close()
  } catch { } finally { try { $res.Close() } catch { } }
}
