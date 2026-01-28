import { join, extname } from 'https://deno.land/std@0.177.0/path/mod.ts';

export function getContentType(filePath: string) {
  const ext = extname(filePath).toLowerCase();
  return ext === '.js' ? 'application/javascript'
       : ext === '.css' ? 'text/css'
       : ext === '.html' ? 'text/html'
       : ext === '.png' ? 'image/png'
       : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
       : ext === '.txt' ? 'text/plain'
       : 'application/octet-stream';
}

export async function serveAsset(req: Request, baseDir: string, urlRoot: string) {
  try {
    const url = new URL(req.url);
    let relativePath = url.pathname.replace(urlRoot, '');
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
    const filePath = join(baseDir, relativePath);

    const stat = await Deno.stat(filePath);
    if (stat.isFile) {
      const content = await Deno.readFile(filePath);
      return new Response(content, { headers: { 'Content-Type': getContentType(filePath), 'Access-Control-Allow-Origin': '*' } });
    }
    return new Response('Not found', { status: 404 });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
