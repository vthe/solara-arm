# 使用支持ARM平台的Node.js基础镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 创建下载目录
RUN mkdir -p /app/downloads

# 复制项目文件
COPY . .

# 安装依赖（如果有package.json）
RUN if [ -f "package.json" ]; then npm install; fi

# 安装静态文件服务
RUN npm install -g http-server

# 安装必要的依赖
RUN npm install express

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["node", "server.js"]