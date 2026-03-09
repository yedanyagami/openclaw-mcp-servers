FROM node:20-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

RUN npm install antigravity-claude-proxy@2.8.1

# Create config directory
RUN mkdir -p /home/node/.config/antigravity-proxy && \
    chown -R node:node /home/node/.config

# Copy default config
COPY config.json /home/node/.config/antigravity-proxy/config.json

# Entrypoint script that injects accounts from env
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Non-root user
USER node
ENV HOME=/home/node

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
