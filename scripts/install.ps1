$ErrorActionPreference = 'Stop'

$repo = if ($env:GHOSTTICKER_REPO) { $env:GHOSTTICKER_REPO } else { 'ggfickle/ghostticker' }
$version = if ($env:GHOSTTICKER_VERSION) { $env:GHOSTTICKER_VERSION } else { 'latest' }
$assetUrl = if ($env:GHOSTTICKER_ASSET_URL) { $env:GHOSTTICKER_ASSET_URL } else { '' }
$installDir = if ($env:GHOSTTICKER_INSTALL_DIR) { $env:GHOSTTICKER_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'ghostticker' }
$binDir = if ($env:GHOSTTICKER_BIN_DIR) { $env:GHOSTTICKER_BIN_DIR } else { Join-Path $env:USERPROFILE '.ghostticker\bin' }

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "ghostticker installer: missing required command: $Name"
  }
}

Require-Command node
Require-Command npm
Require-Command tar

$nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 22) {
  throw 'ghostticker installer: Node.js 22 or newer is required.'
}

if ($version -eq 'latest') {
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
  $tag = $release.tag_name
} else {
  $tag = $version
}

if (-not $tag) {
  throw 'ghostticker installer: could not resolve release tag.'
}

$asset = "ghostticker-$tag.tar.gz"
$url = if ($assetUrl) { $assetUrl } else { "https://github.com/$repo/releases/download/$tag/$asset" }
$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "ghostticker-$([System.Guid]::NewGuid().ToString('N'))"
$archive = Join-Path $tmpDir $asset

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

try {
  Write-Host "Installing ghostticker $tag from $repo"
  Invoke-WebRequest -Uri $url -OutFile $archive
  tar -xzf $archive -C $tmpDir

  if (Test-Path $installDir) {
    Remove-Item -Recurse -Force $installDir
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $installDir), $binDir | Out-Null
  Move-Item -Path (Join-Path $tmpDir 'ghostticker') -Destination $installDir

  Push-Location $installDir
  try {
    npm ci --omit=dev --fund=false --audit=false
  } finally {
    Pop-Location
  }

  $entrypoint = Join-Path $installDir 'dist\cli.js'
  $cmdPath = Join-Path $binDir 'gtr.cmd'
  "@echo off`r`nnode `"$entrypoint`" %*`r`n" | Set-Content -Path $cmdPath -Encoding ASCII

  Write-Host "ghostticker installed to $installDir"

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $userPathEntries = ($userPath -split ';') | Where-Object { $_ }
  if ($userPathEntries -notcontains $binDir) {
    $nextUserPath = if ($userPath) { "$userPath;$binDir" } else { $binDir }
    [Environment]::SetEnvironmentVariable('Path', $nextUserPath, 'User')
    Write-Host "Added $binDir to your user Path."
  }

  $sessionPathEntries = ($env:PATH -split ';') | Where-Object { $_ }
  if ($sessionPathEntries -notcontains $binDir) {
    $env:PATH = "$env:PATH;$binDir"
  }

  Write-Host 'Run: gtr'
} finally {
  if (Test-Path $tmpDir) {
    Remove-Item -Recurse -Force $tmpDir
  }
}
