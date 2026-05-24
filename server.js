const express   = require('express')
const cors      = require('cors')
const dotenv    = require('dotenv')
const path      = require('path')
const https     = require('https')
const connectDB = require('./config/db')

dotenv.config()
connectDB()

const app = express()

app.use(cors({
  origin: function (origin, callback) {
    const permitidos = [
      'https://mundointerino-frontend.vercel.app',
      'https://mundointerino-frontend-git-main-jose-maria-s-projects24.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
    ]
    if (!origin || permitidos.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true)
    }
    callback(new Error('CORS no permitido: ' + origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.options('*', cors())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Rutas ──────────────────────────────────────
app.use('/api/auth',     require('./routes/auth.routes'))
app.use('/api/pisos',    require('./routes/pisos'))
app.use('/api/usuarios', require('./routes/usuarios'))  // ← una sola vez

app.get('/', (req, res) => {
  res.json({ mensaje: '✅ API Mundointerino funcionando correctamente' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' })
})

app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT || 8080
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})

// Keep-alive para Railway
setTimeout(() => {
  setInterval(() => {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      https.get(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`, () => {}).on('error', () => {})
    }
  }, 4 * 60 * 1000)
}, 30000)

process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...')
  server.close(() => {
    console.log('Servidor cerrado correctamente')
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 10000)
})