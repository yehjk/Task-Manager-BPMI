FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

# по умолчанию неважно, в compose зададим command
CMD ["node", "src/gateway.js"]
