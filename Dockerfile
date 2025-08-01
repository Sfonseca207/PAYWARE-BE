# Etapa 1: Construcción (build)
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Copiar archivo de variables de entorno para la construcción
COPY .env .env

RUN npm run build

# Generar cliente de Prisma con las variables de entorno disponibles
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Etapa 2: Imagen final de producción (solo lo esencial)
FROM node:20-alpine as prod

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
COPY --from=build /app/package*.json ./
COPY --from=build /app/.env ./.env

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
