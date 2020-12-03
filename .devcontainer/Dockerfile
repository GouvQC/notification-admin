
FROM python:3.6-alpine

ENV PYTHONDONTWRITEBYTECODE 1

RUN apk add --no-cache build-base libxml2-dev libxslt-dev git nodejs npm g++ make libffi-dev && rm -rf /var/cache/apk/*

# update pip
RUN python -m pip install wheel
RUN python -m pip install --upgrade pip

RUN set -ex && mkdir /app

WORKDIR /app

COPY ./requirements.txt /app

RUN set -ex && pip3 install -r requirements.txt

COPY ./package.json /app

RUN set -ex && npm install

COPY . /app

RUN set -ex && npm run build


RUN make generate-version-file
RUN make babel