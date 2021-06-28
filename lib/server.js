const sse = require('connect-sse')()
const express = require('express')
const crypto = require('crypto')
const path = require('path')
// const Raven = require('raven')
const cors = require('cors')

const channelIsBanned = require('./channel-is-banned-middleware')
const EventBus = require('./event-bus')
const KeepAlive = require('./keep-alive')

// Tiny logger to prevent logs in tests
const log = process.env.NODE_ENV === 'test' ? _ => _ : console.log

module.exports = (testRoute) => {
  const app = express()
  const pubFolder = path.join(__dirname, '..', 'public')
  const bus = new EventBus()

  // Used for testing route error handling
  if (testRoute) testRoute(app)

  app.use(channelIsBanned)

  // if (process.env.SENTRY_DSN) {
  //   Raven.config(process.env.SENTRY_DSN).install()
  //   app.use(Raven.requestHandler())
  // }

  if (process.env.FORCE_HTTPS) {
    app.use(require('helmet')())
    app.use(require('express-sslify').HTTPS({ trustProtoHeader: true }))
  }

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  // app.use('/public', express.static(pubFolder))

  // ** '/', GET
  app.get('/', (req, res) => {
    res.json({"server": "Hooky", "status" : "started", "port" : 3000})
  })

  // ** '/new', POST
  app.post('/new', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const channel = crypto
      .randomBytes(12)
      .toString('base64')
      .replace(/[+/=]+/g, '')

    res.json({"status": 200, "channelUrl": `${protocol}://${host}/${channel}`})
  })

  // ** '/:channel', GET
  app.get('/:channel', sse, (req, res) => {
    const { channel } = req.params

    function send (data) {
      res.json(data)
      keepAlive.reset()
    }

    function close () {
      bus.events.removeListener(channel, send)
      keepAlive.stop()
      log('Client disconnected', channel, bus.events.listenerCount(channel))
    }

    // Setup interval to ping every 30 seconds to keep the connection alive
    const keepAlive = new KeepAlive(() => res.json({}, 'ping'), 30 * 1000)
    keepAlive.start()

    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Listen for events on this channel
    bus.events.on(channel, send)

    // Clean up when the client disconnects
    res.on('close', close)

    res.json({}, 'ready')

    log('Client connected to sse', channel, bus.events.listenerCount(channel))
  })

  // ** '/:channel', POST
  app.post('/:channel', async (req, res) => {
    // Emit an event to the Redis bus
    await bus.emitEvent({
      channel: req.params.channel,
      payload: {
        ...req.headers,
        body: req.body,
        timestamp: Date.now()
      }
    })

    res.json({"status" : 200, "channel": req.params.channel, "data": req.body}).end()
  })

  // ** '/:channel/redeliver', POST
  // Resend payload via the event emitter
  app.post('/:channel/redeliver', async (req, res) => {
    // Emit an event to the Redis bus
    await bus.emitEvent({
      channel: req.params.channel,
      payload: req.body
    })
    res.json({"status" : 200, "channel": req.params.channel, "data": req.body}).end()
  })

  // if (process.env.SENTRY_DSN) {
  //   app.use(Raven.errorHandler())
  // }

  return app
}
