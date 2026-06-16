FROM node:20-alpine

# Install build tools needed for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .

# Data volume mount point
RUN mkdir -p /data

EXPOSE 3001

CMD ["node", "server.js"]
