FROM golang:1.26-alpine AS builder
RUN apk add --no-cache git
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server/ \
 && CGO_ENABLED=0 GOOS=linux go build -o /out/worker ./cmd/worker/

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget
WORKDIR /app
COPY --from=builder /out/server /app/server
COPY --from=builder /out/worker /app/worker
EXPOSE 8080
CMD ["/app/server"]
