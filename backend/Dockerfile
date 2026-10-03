FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files relative to context
COPY backend/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodegroup && \
    adduser -u 1001 -S nodeuser -G nodegroup

COPY --from=builder /app/node_modules ./node_modules

# Copy backend source code
COPY backend/. .

# Copy frontend folder directly since it's now inside the build context
COPY frontend /frontend

RUN chown -R nodeuser:nodegroup /app /frontend

USER nodeuser

EXPOSE 3000

CMD ["node", "server.js"]