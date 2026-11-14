FROM oven/bun:1.4.0
WORKDIR /app
COPY . .
RUN test ! -e .env || (echo ".env não pode entrar na imagem" && exit 1)
RUN bun install --frozen-lockfile --ignore-scripts --production
ENV NODE_ENV=production TZ=America/Sao_Paulo
USER bun
