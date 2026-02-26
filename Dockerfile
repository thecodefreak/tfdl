FROM golang:1.25-alpine AS build
WORKDIR /src

# Copy everything needed for embedding
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
COPY embed.go ./
COPY index.html site.webmanifest ./
COPY assets ./assets
COPY tools ./tools

# Build with embedded files
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/tfdl ./cmd/tfdl

FROM alpine:3.20
RUN adduser -D -h /app app && apk add --no-cache ca-certificates wget
COPY --from=build /out/tfdl /usr/local/bin/tfdl
USER app
WORKDIR /app
EXPOSE 8080
ENTRYPOINT ["tfdl"]
CMD ["serve"]
