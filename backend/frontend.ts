import { join, extname } from 'https://deno.land/std@0.177.0/path/mod.ts';

export async function serveFrontend(req: Request, baseDir: string) {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  const url = new URL(req.url);
  const path = url.pathname;

  let filePath: string;
  if (path === '/') filePath = join(baseDir, 'index.html');
  else if (path === '/chat') filePath = join(baseDir, 'chat/chat.html');
  else if (path === '/favicon.ico') filePath = join(baseDir, 'favicon.ico');
  else filePath = join(baseDir, path);

  try {
    const stat = await Deno.stat(filePath);
    if (stat.isFile) {
      const content = await Deno.readFile(filePath);
      const ext = extname(filePath).toLowerCase();
      const contentType = ext === '.js' ? 'application/javascript'
                       : ext === '.css' ? 'text/css'
                       : ext === '.html' ? 'text/html'
                       : ext === '.png' ? 'image/png'
                       : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                       : 'application/octet-stream';

      return new Response(content, { headers: { ...headers, 'Content-Type': contentType } });
    }
  } catch {}
  return new Response('Not found', { status: 404, headers });
}
