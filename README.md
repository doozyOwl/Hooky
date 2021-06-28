<h1 align="center">HOOKY</a></h1>

Hooky is a webhook payload delivery service - it receives webhook payloads, and sends them to listening clients. You can generate a new channel by using rest api and get a unique URL to send payloads to.
This is a simplified fork of smee.io with addition of few other features.

## API
```
GET /

POST /new

POST /:channel

POST /:channel/redeliver

```

## Environment Variables
- FORCE_HTTPS
- REDIS_URL
- BANNED_CHANNELS
- NODE_ENV

## Deploy
