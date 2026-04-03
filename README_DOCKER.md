# Solara Docker 部署指南

本指南将帮助您在 Docker 环境中部署 Solara 音乐播放器，支持 ARM 平台。

## 📋 前提条件

- 安装 Docker：[Docker 官方安装指南](https://docs.docker.com/get-docker/)
- 安装 Docker Compose（可选）：[Docker Compose 官方安装指南](https://docs.docker.com/compose/install/)

## 🚀 快速部署

### 方法一：使用 Docker Compose（推荐）

1. 克隆本仓库：
   ```bash
   git clone https://github.com/yourusername/Solara.git
   cd Solara
   ```

2. 启动容器：
   ```bash
   docker-compose up -d
   ```

3. 访问应用：打开浏览器，访问 `http://localhost:8080`

### 方法二：使用 Docker 命令

1. 克隆本仓库：
   ```bash
   git clone https://github.com/yourusername/Solara.git
   cd Solara
   ```

2. 构建镜像：
   ```bash
   docker build -t solara .
   ```

3. 运行容器：
   ```bash
   docker run -d -p 8080:8080 --name solara solara
   ```

4. 访问应用：打开浏览器，访问 `http://localhost:8080`

## 🔧 配置说明

### API 配置

项目默认使用 `https://music-api.gdstudio.xyz/api.php` 作为 API 基地址。如需修改，请编辑 `server.js` 文件中的 `API_BASE_URL` 常量。

### 环境变量

在 `docker-compose.yml` 文件中，您可以设置以下环境变量：

- `NODE_ENV`：运行环境，默认为 `production`
- `PORT`：服务器端口，默认为 8080

### 端口映射

默认情况下，容器的 8080 端口会映射到主机的 8080 端口。如需修改，请编辑 `docker-compose.yml` 文件中的端口映射配置。

### 下载目录配置

默认情况下，下载到服务器的文件会保存在容器的 `/app/downloads` 目录中。您可以通过修改 `docker-compose.yml` 文件中的卷挂载配置来指定本地目录：

```yaml
volumes:
  # 挂载下载目录，用户可以修改为自己的目录
  - ./downloads:/app/downloads
  # 可选：挂载本地目录进行开发
  # - .:/app
```

将 `./downloads` 修改为您希望保存下载文件的本地目录路径。

## 📱 移动端体验

将网页添加到手机主屏或通过移动浏览器访问，即可自动切换至竖屏布局。

## 🛠️ 开发模式

如需在开发模式下运行，可取消 `docker-compose.yml` 文件中的卷挂载注释，这样本地文件的更改会实时反映到容器中：

```yaml
volumes:
  - .:/app
```

## 📦 构建多平台镜像

如需构建支持多个平台（如 x86 和 ARM）的镜像，可使用 Docker Buildx：

```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t yourusername/solara:latest --push .
```

## ❓ 常见问题

### 搜索没有结果怎么办？

检查浏览器控制台日志，如接口被阻挡可尝试切换数据源或更新 `API_BASE_URL` 至可用服务。

### 如何重置本地数据？

在浏览器开发者工具的 Application / Storage 面板清理 `localStorage`，即可恢复默认播放列表和配置。

### 收藏或播放列表如何备份？

使用播放队列或收藏列表顶部的「导出」按钮生成 JSON 文件，日后可通过对应列表的「导入」按钮恢复。

## 📄 许可证

本项目采用 CC BY-NC-SA 协议，禁止任何商业化行为，任何衍生项目必须保留本项目地址并以相同协议开源。