// launcher_hidden_python.js — Node.js launcher using Python directly
const { spawn, execSync } = require("child_process");
const path = require("path");
const net = require("net");

// -----------------------------
// Configuration
// -----------------------------
const sdDir = "C:\\Users\\bp014\\stable-diffusion-webui";
const appDir = "C:\\Users\\bp014\\Documents\\GitHub\\Seekura";
const ollamaDir = path.join(appDir, "server");
const ltToken = process.env.TERICK1; // Ensure this is set
const subdomain = "seekura";

// -----------------------------
// Helper Functions
// -----------------------------

// Kill existing processes by name
function killProcess(name) {
  try {
    execSync(`taskkill /F /IM ${name} 2>nul`);
    console.log(`✅ Killed existing process: ${name}`);
  } catch {}
}

// Start a detached process hidden
function startDetached(command, args, cwd, label) {
  spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore", // ignore output
    shell: true
  }).unref();
  console.log(`🚀 ${label} started (hidden)`);
}

// Wait until TCP port is listening
function waitForPort(host, port, label, timeout = 20000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const check = () => {
      const socket = net.createConnection(port, host);
      socket.on("connect", () => {
        socket.destroy();
        console.log(`✅ ${label} is listening on ${host}:${port}`);
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - startTime > timeout) {
          console.log(`⚠️  ${label} did not respond on ${host}:${port} within ${timeout}ms`);
          resolve();
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

// -----------------------------
// Main Launcher
// -----------------------------
async function main() {
  console.log("⏹ Killing existing Python, Node, Deno processes...");
  ["python.exe", "python3.exe", "node.exe", "deno.exe"].forEach(killProcess);

  // -----------------------------
  // 1. Stable Diffusion (Python directly)
  // -----------------------------
  console.log("⏳ Starting Stable Diffusion...");
  startDetached(
    "python",
    ["launch.py", "--xformers", "--listen", "--api", "--skip-python-version-check"],
    sdDir,
    "Stable Diffusion"
  );

  // Wait for SD API port 7860
  await waitForPort("127.0.0.1", 7860, "Stable Diffusion API");

  // -----------------------------
  // 2. Ollama Proxy
  // -----------------------------
  console.log("⏳ Starting Ollama Proxy...");
  startDetached("deno", ["run", "--allow-net", "--allow-read", "--allow-env", "ollamaProxy.js"], ollamaDir, "Ollama Proxy");

  // -----------------------------
  // 3. Gateway
  // -----------------------------
  console.log("⏳ Starting Gateway...");
  startDetached("deno", ["run", "--allow-net", "--allow-read", "--allow-env", "gateway.ts"], ollamaDir, "Gateway");

  // Wait for Gateway port 8000
  await waitForPort("127.0.0.1", 8000, "Gateway");

  // -----------------------------
  // 4. LocalTunnel
  // -----------------------------
  console.log("⏳ Starting LocalTunnel...");
  const ltCommand = `lt --port 8000 --subdomain ${subdomain}${ltToken ? " --token " + ltToken : ""}`;
  startDetached("cmd.exe", ["/c", ltCommand], appDir, "LocalTunnel");

  console.log("🎉 All services launched! Access frontend at https://" + subdomain + ".loca.lt");

  // Keep Node alive
  setInterval(() => {}, 1000);
}

main();
