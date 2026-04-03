const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const API_BASE_URL = "https://music-api.gdstudio.xyz/api.php";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

async function fetchJson(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn("JSON parse failed, returning raw text", parseError);
      return text;
    }
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

async function handlePost(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const { song, quality = "320" } = body;

    if (!song || !song.id || !song.source) {
      return jsonResponse({ error: "Invalid song data" }, 400);
    }

    // 获取音频URL
    const signature = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const audioUrl = `${API_BASE_URL}?types=url&id=${song.id}&source=${song.source}&br=${quality}&s=${signature}`;
    const audioData = await fetchJson(audioUrl);

    if (!audioData || !audioData.url) {
      return jsonResponse({ error: "Failed to get audio URL" }, 500);
    }

    // 下载音频文件
    const audioResponse = await fetch(audioData.url);
    if (!audioResponse.ok) {
      return jsonResponse({ error: "Failed to download audio file" }, 500);
    }

    // 生成文件名
    const preferredExtension = quality === "999" ? "flac" : quality === "740" ? "ape" : "mp3";
    let fileExtension = preferredExtension;
    
    try {
      const url = new URL(audioData.url);
      const pathname = url.pathname || "";
      const match = pathname.match(/\.([a-z0-9]+)$/i);
      if (match) {
        fileExtension = match[1];
      }
    } catch (error) {
      console.warn("无法从下载链接中解析扩展名:", error);
    }

    const filename = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(", ") : song.artist}.${fileExtension}`;

    // 保存文件到服务器（这里需要根据实际环境调整保存路径）
    // 注意：在Cloudflare Pages Functions中，我们无法直接写入文件系统
    // 但在Docker环境中，我们可以通过卷挂载来实现
    
    // 对于Docker环境，我们可以将文件保存到 /app/downloads 目录
    const downloadPath = `/app/downloads/${filename}`;
    
    // 注意：在Cloudflare Pages Functions中，以下代码会失败
    // 但在Docker环境中，使用Node.js运行时会正常工作
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      const fs = require('fs');
      const path = require('path');
      
      // 确保下载目录存在
      const downloadDir = path.dirname(downloadPath);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      // 保存文件
      const buffer = await audioResponse.arrayBuffer();
      fs.writeFileSync(downloadPath, Buffer.from(buffer));
      
      return jsonResponse({ 
        success: true, 
        filename, 
        path: downloadPath, 
        message: `File downloaded to server: ${downloadPath}` 
      });
    } else {
      // 对于Cloudflare Pages Functions，返回错误
      return jsonResponse({ 
        error: "Server-side download is only available in Docker environment" 
      }, 500);
    }
  } catch (error) {
    console.error("Download error:", error);
    return jsonResponse({ error: "Download failed: " + (error instanceof Error ? error.message : String(error)) }, 500);
  }
}

export async function onRequest(context: any): Promise<Response> {
  const { request } = context;
  const method = (request.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  if (method === "POST") {
    return handlePost(request);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}