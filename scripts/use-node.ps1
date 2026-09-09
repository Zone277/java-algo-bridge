# Dot-source in the project shell: . ./scripts/use-node.ps1
# Only modifies this PowerShell process; never changes the global PATH.
$projectNodeDirectory = Join-Path $PSScriptRoot '../.tools/node-v24.20.0-win-x64'
if (-not (Test-Path (Join-Path $projectNodeDirectory 'node.exe'))) {
    throw 'Node 24.20.0 missing. Install the version in .nvmrc or prepare the local official ZIP as documented.'
}
$env:Path = (Resolve-Path $projectNodeDirectory).Path + ';' + $env:Path
node --version
npm --version
