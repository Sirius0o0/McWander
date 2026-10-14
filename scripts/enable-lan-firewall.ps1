$ErrorActionPreference = 'Stop'
$mcWanderArtifacts = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\artifacts'))
New-Item -ItemType Directory -Path $mcWanderArtifacts -Force | Out-Null
$mcWanderFirewallResult = Join-Path $mcWanderArtifacts 'lan-firewall-result.json'
try {
    $maiWalkNode = (Get-Command node.exe -ErrorAction Stop).Source
    $maiWalkRuleName = 'MaiWalk-Demo-LAN-4173'
    $maiWalkRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1
    $maiWalkAddress = Get-NetIPAddress -InterfaceIndex $maiWalkRoute.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress
    if (-not $maiWalkAddress) { throw 'No active LAN IPv4 address found.' }
    if (-not (Get-NetFirewallRule -Name $maiWalkRuleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -Name $maiWalkRuleName -DisplayName 'McWander LAN TCP 4173' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4173 -LocalAddress $maiWalkAddress -RemoteAddress LocalSubnet -Program $maiWalkNode -Profile Any | Out-Null
    } else {
        Set-NetFirewallRule -Name $maiWalkRuleName -Enabled True -Action Allow -Profile Any | Out-Null
        Get-NetFirewallRule -Name $maiWalkRuleName | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -LocalAddress $maiWalkAddress -RemoteAddress LocalSubnet | Out-Null
    }
    Get-NetFirewallRule -Name $maiWalkRuleName | Select-Object Name, Enabled, Direction, Action | ConvertTo-Json | Set-Content -LiteralPath $mcWanderFirewallResult -Encoding UTF8
    exit 0
} catch {
    [pscustomobject]@{error=$_.Exception.Message} | ConvertTo-Json | Set-Content -LiteralPath $mcWanderFirewallResult -Encoding UTF8
    exit 1
}
