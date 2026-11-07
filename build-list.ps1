# Regenerates assets/files.js from the project folders.
# Every subfolder (except the ones in $skip) becomes a section on the site, in alphabetical order.
# Run again after adding/removing/renaming work:  powershell -ExecutionPolicy Bypass -File .\build-list.ps1
$root = $PSScriptRoot
$skip = @('about me', 'Experience', 'assets', '.claude', 'design-system')
$media = '\.(png|jpe?g|gif|webp|mp4|webm|mov)$'
$out = [ordered]@{}
Get-ChildItem -LiteralPath $root -Directory | Where-Object { $skip -notcontains $_.Name } | Sort-Object Name | ForEach-Object {
  $cat = $_.Name
  $files = @(Get-ChildItem -LiteralPath $_.FullName -File | Where-Object { $_.Name -match $media } | Sort-Object Name | ForEach-Object { "$cat/" + $_.Name })
  if ($files.Count) { $out[$cat] = $files }
}
New-Item -ItemType Directory -Force (Join-Path $root 'assets') | Out-Null
$json = $out | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $root 'assets\files.js'), "window.FILES = $json;", (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("assets/files.js written: " + (($out.Keys | ForEach-Object { "$_ (" + $out[$_].Count + ")" }) -join ', '))
