FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Variante oficial do nginx que roda como usuário comum (sem root).
FROM nginxinc/nginx-unprivileged:1.27-alpine
# A imagem do nginx preenche o template ao iniciar; o filtro evita tocar nas variáveis do próprio nginx.
ENV API_UPSTREAM=http://backend:3000 \
    NGINX_ENVSUBST_FILTER=^API_
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY seguranca.conf /etc/nginx/seguranca.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
