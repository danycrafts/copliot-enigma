FROM python:3.10-alpine

LABEL org.opencontainers.image.title="Copliot Enigma"
LABEL org.opencontainers.image.description="Copliot Enigma packages a Wails-powered automation backend with a Material-inspired Tkinter workspace for orchestrating secure desktop intelligence."
LABEL org.opencontainers.image.vendor="Copliot Enigma maintainers"
LABEL org.opencontainers.image.source="https://github.com/danycrafts/copliot-enigma"
LABEL org.opencontainers.image.url="https://github.com/danycrafts/copliot-enigma"
LABEL org.opencontainers.image.licenses="MIT"
LABEL maintainer="Copliot Enigma Team <maintainers@copliot-enigma.dev>"
LABEL version="0.1.0"

ENV APP_USER=enigma

RUN apk update && apk add --no-cache \
    bash build-base dbus-x11 libffi-dev py3-pip python3 shadow \
    tcl tcl-dev tk tk-dev ttf-dejavu wget xfce4 xfce4-terminal \
    xorg-server xvfb unzip chromium chromium-chromedriver nss \
    freetype harfbuzz ca-certificates ttf-freefont

RUN mkdir -p /app/chrome/browser && \
    ln -s /usr/bin/chromium-browser /app/chrome/browser/chrome && \
    ln -s /usr/bin/chromedriver /app/chrome/chromedriver

RUN apk add --no-cache --virtual .build-deps gcc musl-dev && \
    pip install --upgrade pip && \
    pip install pipenv ttkbootstrap && \
    apk del .build-deps

WORKDIR /app

COPY ./src /app/src
COPY ./Pipfile /app/Pipfile
COPY ./Pipfile.lock /app/Pipfile.lock

RUN adduser -D -s /bin/bash "$APP_USER" && \
    chown -R "$APP_USER":"$APP_USER" /app

USER "$APP_USER"

RUN pipenv install --deploy

CMD ["pipenv", "run", "python", "src/main.py"]
