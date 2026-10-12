FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3000 DATA_FILE=/app/data/pilot.json
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "src/server.cjs"]
