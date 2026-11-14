# Stop the process listening on the backend port AND its child processes
# (uvicorn --reload spawns a worker that can otherwise linger and keep the port blocked -> WinError 10013).
param([int]$Port = 8000)
$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conns) { Write-Host "Nothing is listening on port $Port."; exit 0 }
foreach ($procId in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$procId" -ErrorAction SilentlyContinue
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
    Write-Host "PID ${procId}: $($p.CommandLine)"
    foreach ($c in $children) {
        Write-Host "  child PID $($c.ProcessId): $($c.CommandLine)"
        Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped."
}
