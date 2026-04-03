FROM node:20-bookworm-slim

WORKDIR /app

# Keep build context clean and install runtime dependency in-container.
COPY . .
RUN npm install --omit=dev express
RUN mkdir -p /app/downloads

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
