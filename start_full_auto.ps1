cls

Write-Host "Killing existing Python, Node, Deno processes..."
Get-Process python, node, deno -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue

$Env:SUPABASE_URL="https://fhtzawegbejlfyqkipnp.supabase.co"
$Env:SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodHphd2VnYmVqbGZ5cWtpcG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0Mzk4MDMsImV4cCI6MjA4NDAxNTgwM30.13S_lHY3ftr98r3lPvAGLKOrfyVI2hTFfywLTjwUmug"


$ErrorActionPreference = "Stop"

# -----------------------------
# Paths / configuration
# -----------------------------
$sdDir       = "C:\Users\bp014\stable-diffusion-webui"
$appDir      = "C:\Users\bp014\Documents\GitHub\Seekura"
$ollamaDir   = "$appDir\server"  # Ollama proxy folder
$gatewayFile = "$appDir\backend\gateway.ts"   # the new single-URL gateway
$ltToken     = $env:Terick1
$subdomain   = "seekura"               # single URL



# -----------------------------
# 1. Launch Stable Diffusion WebUI (local only)
# -----------------------------
#Write-Host "Starting Stable Diffusion..."
#Start-Process -FilePath "cmd.exe" `
#    -ArgumentList "/c `"$sdDir\webui.bat`" --xformers --listen --api --skip-python-version-check" `
#    -WorkingDirectory $sdDir
#Start-Sleep -Seconds 20
#Write-Host "Stable Diffusion launched."

# -----------------------------
# 2. Start Ollama Proxy (local only)
# -----------------------------
Write-Host "Starting Ollama Proxy..."

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k deno run --allow-net --allow-read --allow-env $ollamaDir\ollamaProxy.ts" `
    -WorkingDirectory $ollamaDir
    
Start-Sleep -Seconds 5


Write-Host "Ollama proxy launched."


# -----------------------------
# 3. Start Gateway (single-URL for /chat & /img)
# -----------------------------
Write-Host "Starting Gateway Proxy..."

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k deno run --allow-net --allow-read --allow-env $gatewayFile" `
    -WorkingDirectory $appDir
Start-Sleep -Seconds 5

Write-Host "Gateway launched."

# -----------------------------
# 4. Expose via LocalTunnel (single subdomain)
# -----------------------------

Write-Host "Starting LocalTunnel for gateway..."

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k lt --port 8000 --subdomain $subdomain --token $ltToken" `
    -WorkingDirectory $appDir
    

Write-Host "All services launched!"


