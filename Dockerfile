FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/tfdl ./cmd/tfdl

FROM alpine:3.20
WORKDIR /srv/tfdl
RUN adduser -D -h /srv/tfdl app \
  && apk add --no-cache ca-certificates
COPY --from=build /out/tfdl /usr/local/bin/tfdl
USER app
EXPOSE 8080
ENTRYPOINT ["tfdl"]
CMD ["serve"]
