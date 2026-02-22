FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate && npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && node dist/src/server.js"]
