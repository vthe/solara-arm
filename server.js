const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(__dirname));

// API 路由
app.post('/api/download', async (req, res) => {
    try {
        const { song, quality = "320" } = req.body;

        if (!song || !song.id || !song.source) {
            return res.status(400).json({ error: "Invalid song data" });
        }

        // API 配置
        const API_BASE_URL = "https://music-api.gdstudio.xyz/api.php";

        // 获取音频URL
        const signature = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const audioUrl = `${API_BASE_URL}?types=url&id=${song.id}&source=${song.source}&br=${quality}&s=${signature}`;
        
        // 发送请求获取音频URL
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to get audio URL: ${audioResponse.status}`);
        }
        
        const audioData = await audioResponse.json();
        
        if (!audioData || !audioData.url) {
            return res.status(500).json({ error: "Failed to get audio URL" });
        }

        // 下载音频文件
        const audioFileResponse = await fetch(audioData.url);
        if (!audioFileResponse.ok) {
            throw new Error(`Failed to download audio file: ${audioFileResponse.status}`);
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

        // 确保下载目录存在
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }
        
        // 保存文件
        const downloadPath = path.join(downloadDir, filename);
        const buffer = await audioFileResponse.arrayBuffer();
        fs.writeFileSync(downloadPath, Buffer.from(buffer));
        
        res.json({ 
            success: true, 
            filename, 
            path: downloadPath, 
            message: `File downloaded to server: ${downloadPath}` 
        });
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: "Download failed: " + (error instanceof Error ? error.message : String(error)) });
    }
});

// 代理路由
app.get('/proxy', async (req, res) => {
    try {
        const API_BASE_URL = "https://music-api.gdstudio.xyz/api.php";
        const params = new URLSearchParams(req.query);
        const target = params.get('target');
        
        if (target) {
            // 处理音频代理
            const response = await fetch(target, {
                headers: {
                    "User-Agent": req.headers['user-agent'] || "Mozilla/5.0",
                    "Referer": "https://www.kuwo.cn/",
                },
            });
            
            res.set(response.headers);
            res.status(response.status);
            res.send(await response.buffer());
        } else {
            // 处理API请求
            const apiUrl = `${API_BASE_URL}?${params.toString()}`;
            const response = await fetch(apiUrl, {
                headers: {
                    "User-Agent": req.headers['user-agent'] || "Mozilla/5.0",
                    "Accept": "application/json",
                },
            });
            
            res.set('Access-Control-Allow-Origin', '*');
            res.status(response.status);
            res.send(await response.json());
        }
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Proxy failed: " + (error instanceof Error ? error.message : String(error)) });
    }
});

// 存储API
app.get('/api/storage', (req, res) => {
    res.json({ d1Available: false, data: {} });
});

app.post('/api/storage', (req, res) => {
    res.json({ d1Available: false, data: {} });
});

app.delete('/api/storage', (req, res) => {
    res.json({ d1Available: false });
});

// 登录API
app.get('/api/login', (req, res) => {
    res.json({ success: true });
});

// 启动服务器
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Download directory: ${path.join(__dirname, 'downloads')}`);
});