# vai seguir config da maq1uina

# //ubuntu:
FROM node:17-slim 
RUN apt-get update \
  && apt-get install -y sox libsox-fmt-mp3
  
  # libsox-fmt-all

WORKDIR /spotify-radio/

# para cachear a nao ficar instalando pacotes a toda hora
COPY package.json package-lock.json /spotify-radio/

# rodar pacotes
# RUN npm ci --silent
RUN yarn

COPY . .

# garanti que nao tera acceso externo (a nossa maquina)
USER node

CMD yarn live-reload
