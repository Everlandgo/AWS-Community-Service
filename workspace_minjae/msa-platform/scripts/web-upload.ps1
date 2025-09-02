param(
  [string]$BuildDir = "./web-build"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (Test-Path ..\terraform.exe) { $tf = '..\terraform.exe' }
elseif (Test-Path .\terraform.exe) { $tf = '.\terraform.exe' }
else { $tf = 'terraform' }

$bucket = & $tf output -raw web_bucket_name 2>$null
if (-not $bucket -or $bucket -eq 'null') {
  Write-Error 'web_bucket_name 출력이 비어있습니다. enable_web=true 적용 후 다시 실행하세요.'
}

if (-not (Test-Path $BuildDir)) {
  Write-Error "빌드 디렉터리를 찾을 수 없습니다: $BuildDir"
}

aws s3 sync $BuildDir "s3://$bucket" --exclude "index.html" --cache-control "public,max-age=31536000,immutable" --delete | Out-Host
aws s3 cp (Join-Path $BuildDir 'index.html') "s3://$bucket/index.html" --cache-control "no-store,max-age=0" --content-type "text/html" | Out-Host


