FROM node:24-alpine AS base
WORKDIR /app
RUN apk --no-cache add vips-tools && mkdir -p /files/public /files/private /db
COPY seed/files /files/

FROM base AS prod
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma7.config.ts ./

RUN npm ci && npx prisma generate

COPY . .

CMD ["node", "--experimental-strip-types", "index.ts"]