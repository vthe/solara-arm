const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(__dirname));

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 获取默认音源配置
const defaultMusicSource = process.env.DEFAULT_MUSIC_SOURCE || 'netease';

// API 路由
app.post('/api/download', async (req, res) => {
    try {
        let { song, quality = "320" } = req.body;

        if (!song || !song.id || !song.source) {
            return res.status(400).json({ error: "Invalid song data" });
        }

        // API 配置
        const API_BASE_URL = "https://music-api.gdstudio.xyz/api.php";

        // 定义质量优先级（从高到低）
        const qualityFallbackOrder = quality === "999" 
            ? ["999", "740", "320", "192", "128"]  // FLAC > APE > 320k > 192k > 128k
            : quality === "740"
            ? ["740", "999", "320", "192", "128"]  // APE > FLAC > 320k > 192k > 128k
            : [quality];

        let audioData = null;
        let usedQuality = null;

        // 尝试按优先级获取音频URL
        for (const attemptQuality of qualityFallbackOrder) {
            try {
                const signature = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                const audioUrl = `${API_BASE_URL}?types=url&id=${song.id}&source=${song.source}&br=${attemptQuality}&s=${signature}`;
                
                console.log(`[Download] Requesting: quality=${attemptQuality}, songId=${song.id}, source=${song.source}`);
                
                const audioResponse = await fetch(audioUrl);
                if (!audioResponse.ok) {
                    throw new Error(`Failed to get audio URL: ${audioResponse.status}`);
                }
                
                const data = await audioResponse.json();
                
                console.log(`[Download] API Response for quality ${attemptQuality}:`, !!data?.url);
                
                if (data && data.url) {
                    audioData = data;
                    usedQuality = attemptQuality;
                    
                    if (attemptQuality !== quality) {
                        console.log(`[Download] Original quality ${quality} not available, using ${attemptQuality}`);
                    }
                    break;
                }
            } catch (error) {
                console.log(`[Download] Failed to get quality ${attemptQuality}: ${error.message}`);
                if (attemptQuality === qualityFallbackOrder[qualityFallbackOrder.length - 1]) {
                    // 如果都失败了，抛出错误
                    throw error;
                }
                // 否则继续尝试下一个质量
                continue;
            }
        }

        if (!audioData || !audioData.url) {
            return res.status(500).json({ error: "Failed to get audio URL from all quality levels" });
        }

        // 下载音频文件
        const audioFileResponse = await fetch(audioData.url);
        if (!audioFileResponse.ok) {
            throw new Error(`Failed to download audio file: ${audioFileResponse.status}`);
        }

        // 生成文件名
        const preferredExtension = usedQuality === "999" ? "flac" : usedQuality === "740" ? "ape" : "mp3";
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
        
        const qualityLabel = usedQuality === "999" ? "无损(FLAC)" : usedQuality === "740" ? "无损(APE)" : usedQuality === "320" ? "极高音质" : usedQuality === "192" ? "高品音质" : "标准音质";
        
        res.json({ 
            success: true, 
            filename, 
            path: downloadPath,
            quality: usedQuality,
            qualityLabel,
            message: `File downloaded to server: ${downloadPath} (${qualityLabel})` 
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

// 存储API - 用户数据持久化（收藏列表、播放列表、设置等）
app.get('/api/user-data/:key', (req, res) => {
    try {
        const { key } = req.params;
        const dataFile = path.join(dataDir, `${key}.json`);
        
        if (fs.existsSync(dataFile)) {
            const data = fs.readFileSync(dataFile, 'utf8');
            res.json({ success: true, data: JSON.parse(data) });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (error) {
        console.error("Get user data error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/user-data/:key', (req, res) => {
    try {
        const { key } = req.params;
        const { data } = req.body;
        
        if (!key || data === undefined) {
            return res.status(400).json({ success: false, error: "Missing key or data" });
        }
        
        const dataFile = path.join(dataDir, `${key}.json`);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        
        console.log(`[Storage] Saved user data: ${key}`);
        res.json({ success: true, message: `User data saved: ${key}` });
    } catch (error) {
        console.error("Save user data error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/user-data/:key', (req, res) => {
    try {
        const { key } = req.params;
        const dataFile = path.join(dataDir, `${key}.json`);
        
        if (fs.existsSync(dataFile)) {
            fs.unlinkSync(dataFile);
            console.log(`[Storage] Deleted user data: ${key}`);
        }
        
        res.json({ success: true, message: `User data deleted: ${key}` });
    } catch (error) {
        console.error("Delete user data error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 配置API
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            defaultMusicSource: defaultMusicSource,
            apiBase: process.env.MUSIC_API_BASE || 'https://music-api.gdstudio.xyz/api.php'
        }
    });
});

// 兼容旧的存储API
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
    console.log(`Data directory: ${dataDir}`);
    console.log(`Default music source: ${defaultMusicSource}`);
});