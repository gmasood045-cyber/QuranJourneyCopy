// Dev-only bridge between the Vite preview and the local Muaalem service.
//  - Forwards /muaalem/* to poc/muaalem/server.py. When the service is not
//    listening it answers 503 JSON (the harness shows "offline") instead of
//    letting Vite's proxy log an ECONNREFUSED stack on every health poll.
//  - If the local Python install exists, starts the service as a child of the
//    supervised dev server so it lives (and stops) with the preview. Without
//    the install it does nothing: no model, no simulated results.
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import type { Plugin } from 'vite'

const HOST = '127.0.0.1'
const PORT = Number(process.env.MUAALEM_PORT || 8765)
const PYTHON = process.env.MUAALEM_PYTHON || '/tmp/mvenv/bin/python'
const MODEL = process.env.MUAALEM_MODEL || (fs.existsSync('/tmp/hf/muaalem-v3_2/model.safetensors') ? '/tmp/hf/muaalem-v3_2' : 'obadx/muaalem-model-v3_2')

function portInUse(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect(PORT, HOST)
    s.once('connect', () => (s.destroy(), resolve(true)))
    s.once('error', () => resolve(false))
  })
}

export function muaalemDevBridge(): Plugin {
  let child: ChildProcess | null = null
  return {
    name: 'rafiqi-muaalem-dev-bridge',
    apply: 'serve',
    async configureServer(server) {
      const dir = path.resolve(__dirname)
      if (process.env.MUAALEM_AUTOSTART !== '0' && fs.existsSync(PYTHON) && !(await portInUse())) {
        child = spawn(PYTHON, ['server.py'], {
          cwd: dir,
          stdio: ['ignore', 'ignore', 'inherit'],
          env: { ...process.env, MUAALEM_MODEL: MODEL, MUAALEM_PORT: String(PORT), MALLOC_ARENA_MAX: '2', HF_HOME: process.env.HF_HOME || '/tmp/hf/cache' },
        })
        child.on('exit', () => (child = null))
        server.httpServer?.once('close', () => child?.kill())
      }

      server.middlewares.use('/muaalem', (req, res) => {
        const upstream = http.request(
          { host: HOST, port: PORT, method: req.method, path: req.url, headers: { ...req.headers, host: `${HOST}:${PORT}` } },
          (up) => {
            res.writeHead(up.statusCode || 502, up.headers)
            up.pipe(res)
          },
        )
        upstream.on('error', () => {
          if (res.headersSent) return res.end()
          res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify({ error: child ? 'Inference service is starting' : 'Inference service is not running' }))
        })
        req.pipe(upstream)
      })
    },
  }
}
