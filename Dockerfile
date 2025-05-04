FROM ubuntu:focal

RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y nodejs ffmpeg

WORKDIR /home/app

RUN npm i -g nodemon

CMD nodemon index.js