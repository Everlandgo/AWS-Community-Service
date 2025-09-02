Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (Test-Path ..\terraform.exe) { $tf = '..\terraform.exe' }
elseif (Test-Path .\terraform.exe) { $tf = '.\terraform.exe' }
else { $tf = 'terraform' }

$dist = & $tf output -raw cloudfront_distribution_id 2>$null
if (-not $dist -or $dist -eq 'null') {
  Write-Error 'cloudfront_distribution_id 출력이 비어있습니다. enable_web=true 적용 후 다시 실행하세요.'
}

aws cloudfront create-invalidation --distribution-id $dist --paths '/*' | Out-Host


