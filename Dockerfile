FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/webtools ./cmd/webtools

FROM alpine:3.20
WORKDIR /srv/webtools
RUN adduser -D -h /srv/webtools app \
  && apk add --no-cache ca-certificates
COPY --from=build /out/webtools /usr/local/bin/webtools
USER app
EXPOSE 8080
ENTRYPOINT ["webtools"]
CMD ["serve"]
