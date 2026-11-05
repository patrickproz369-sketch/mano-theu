import { useEffect, useMemo, useState } from 'react'
import './App.css'

/* ====== CONFIGURAÇÕES (edite aqui) ====== */
// COLOQUE SEU NUMERO AQUI (DDD + Numero sem espaços nem traços)
const WHATSAPP_NUMBER = '553197218482'
const ADMIN_USER = 'theuz'
const ADMIN_PASS = 'theuzZ'

const OPEN_MIN = 8 * 60 // abre às 08:00
const CLOSE_MIN = 18 * 60 // fecha às 18:00
const STEP_MIN = 30 // intervalo dos horários (30 ou 60)
const CLOSED_WEEKDAY = 1 // 1 = segunda-feira (fechado)

const SERVICES = [
  { id: 'corte', name: 'Corte Tradicional / Fade', price: 'R$ 35,00', icon: '✂️' },
  { id: 'barba', name: 'Barba Completa / Toalha Quente', price: 'R$ 25,00', icon: '🪒' },
  { id: 'combo', name: 'Combo (Corte + Barba)', price: 'R$ 55,00', icon: '🔥' },
  { id: 'sobrancelha', name: 'Sobrancelha na Navalha', price: 'R$ 15,00', icon: '✨' },
  { id: 'pezinho', name: 'Pezinho / Acabamento', price: 'R$ 15,00', icon: '💈' },
]
const BARBERS = ['Mano Theu', 'Barbeiro Convidado']

/* ====== AUXILIARES ====== */
const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const isClosedDay = (k) => fromKey(k).getDay() === CLOSED_WEEKDAY
const longDate = (k) => fromKey(k).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
const shortDate = (k) => k.split('-').reverse().join('/')
const weekdayName = (k) => fromKey(k).toLocaleDateString('pt-BR', { weekday: 'long' })

const SLOTS = (() => {
  const out = []
  for (let t = OPEN_MIN; t + STEP_MIN <= CLOSE_MIN; t += STEP_MIN) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`)
  return out
})()

const isPastSlot = (dateKey, time) => {
  if (dateKey !== keyOf(new Date())) return false
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes()
}
const isAvailable = (blocked, dateKey, time) =>
  !isClosedDay(dateKey) && !(blocked[dateKey] || []).includes(time) && !isPastSlot(dateKey, time)

const firstOpenDay = () => {
  const d = startOfToday()
  while (d.getDay() === CLOSED_WEEKDAY) d.setDate(d.getDate() + 1)
  return keyOf(d)
}

/* Horários bloqueados ficam salvos no navegador (localStorage) */
function useBlockedSlots() {
  const [blocked, setBlocked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mt-blocked')) || {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('mt-blocked', JSON.stringify(blocked))
    } catch {
      /* sem armazenamento disponível */
    }
  }, [blocked])
  return [blocked, setBlocked]
}

/* ====== COMPONENTES ====== */
function Calendar({ value, onSelect }) {
  const today = startOfToday()
  const [view, setView] = useState(() => {
    const base = value ? fromKey(value) : today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const atMin = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth()
  const move = (n) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1))

  const cells = [
    ...Array(view.getDay()).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ]

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" className="icon-btn" onClick={() => move(-1)} disabled={atMin} aria-label="Mês anterior">
          ‹
        </button>
        <strong className="cap">{view.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="icon-btn" onClick={() => move(1)} aria-label="Próximo mês">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((w) => (
          <span key={w} className="cal-week">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />
          const k = keyOf(d)
          const cls = [
            'cal-day',
            d < today && 'is-past',
            d.getDay() === CLOSED_WEEKDAY && 'is-closed',
            k === value && 'is-selected',
            k === keyOf(today) && 'is-today',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={k} type="button" className={cls} disabled={d < today} aria-pressed={k === value} onClick={() => onSelect(k)}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
      <p className="cal-legend">Segunda-feira: fechado.</p>
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function LoginModal({ onClose, onSuccess }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (user.trim() === ADMIN_USER && pass === ADMIN_PASS) onSuccess()
    else setError('Usuário ou senha incorretos. Confira e tente de novo.')
  }

  return (
    <Modal title="Acesso do proprietário" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="adm-user">Usuário</label>
          <input id="adm-user" type="text" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus />
        </div>
        <div className="form-group">
          <label htmlFor="adm-pass">Senha</label>
          <input id="adm-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
        </div>
        {error && (
          <p className="notice warn" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="submit-btn btn-silver">
          Entrar
        </button>
      </form>
    </Modal>
  )
}

function AdminPanel({ blocked, setBlocked, onLogout, onClose }) {
  const [date, setDate] = useState(firstOpenDay)
  const closed = isClosedDay(date)
  const dayBlocked = blocked[date] || []

  const toggle = (time) =>
    setBlocked((prev) => {
      const set = new Set(prev[date] || [])
      if (set.has(time)) set.delete(time)
      else set.add(time)
      return { ...prev, [date]: [...set] }
    })
  const setAll = (lock) => setBlocked((prev) => ({ ...prev, [date]: lock ? [...SLOTS] : [] }))

  return (
    <Modal title="Painel do proprietário" onClose={onClose} wide>
      <div className="admin-bar">
        <p>
          Olá, Mano Theu. Toque em um horário para alternar entre <b>disponível</b> e <b>bloqueado</b>.
        </p>
        <button type="button" className="btn-ghost" onClick={onLogout}>
          Sair
        </button>
      </div>
      <div className="date-time">
        <Calendar value={date} onSelect={setDate} />
        <div>
          <h3 className="cap">{longDate(date)}</h3>
          {closed ? (
            <p className="notice warn">Segunda-feira é dia de folga. Não há horários para gerenciar.</p>
          ) : (
            <>
              <div className="slots">
                {SLOTS.map((t) => {
                  const lock = dayBlocked.includes(t)
                  return (
                    <button key={t} type="button" className={`slot ${lock ? 'is-blocked' : 'is-free'}`} onClick={() => toggle(t)}>
                      {t}
                      <small>{lock ? 'Bloqueado' : 'Livre'}</small>
                    </button>
                  )
                })}
              </div>
              <div className="row-actions">
                <span className="muted">
                  {SLOTS.length - dayBlocked.length} livres, {dayBlocked.length} bloqueados
                </span>
                <button type="button" className="btn-ghost" onClick={() => setAll(false)}>
                  Liberar o dia
                </button>
                <button type="button" className="btn-ghost" onClick={() => setAll(true)}>
                  Bloquear o dia
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ====== APP ====== */
export default function App() {
  const [blocked, setBlocked] = useBlockedSlots()
  const [isAdmin, setIsAdmin] = useState(false)
  const [modal, setModal] = useState(null) // 'login' | 'admin' | null

  const [selectedService, setSelectedService] = useState('')
  const [selectedBarber, setSelectedBarber] = useState(BARBERS[0])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [clientName, setClientName] = useState('')

  const serviceObj = SERVICES.find((s) => s.id === selectedService)
  const closed = date && isClosedDay(date)
  const freeCount = useMemo(() => (date ? SLOTS.filter((t) => isAvailable(blocked, date, t)).length : 0), [blocked, date])
  const ready = clientName.trim() && serviceObj && date && !closed && time && isAvailable(blocked, date, time)
  const missing = !clientName.trim()
    ? 'Informe seu nome.'
    : !serviceObj
      ? 'Escolha um serviço.'
      : !date
        ? 'Escolha uma data.'
        : closed
          ? 'Escolha um dia de terça a domingo.'
          : !time
            ? 'Escolha um horário.'
            : ''

  const pickDate = (k) => {
    setDate(k)
    setTime('')
  }

  const handleBooking = (e) => {
    e.preventDefault()
    if (!ready) return
    const message =
      `💈 *AGENDAMENTO - MANO THEU BARBERSHOP* 💈\n\n` +
      `👤 *Cliente:* ${clientName.trim()}\n` +
      `✂️ *Serviço:* ${serviceObj.name} (${serviceObj.price})\n` +
      `💈 *Barbeiro:* ${selectedBarber}\n` +
      `📅 *Data:* ${shortDate(date)} (${weekdayName(date)})\n` +
      `⏰ *Horário:* ${time}\n\n` +
      `Gostaria de confirmar esse horário!`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const openOwnerArea = () => setModal(isAdmin ? 'admin' : 'login')

  return (
    <div className="app-container">
      <div className="pole" aria-hidden="true" />

      <header className="header">
        <div className="logo-badge">
          <div className="logo-inner">
            <h1>Mano Theu</h1>
            <p className="subtitle">BARBERSHOP</p>
            <div className="monogram">MT</div>
          </div>
        </div>
        <p className="tagline">Estilo, Respeito e Tradição na Navalha</p>
        <p className="hours">
          Terça a domingo, das 08:00 às 18:00. <span>Fechado às segundas.</span>
        </p>
      </header>

      <main className="main-content">
        <form onSubmit={handleBooking} className="booking-card">
          <h2>Agende seu Horário</h2>

          <div className="form-group">
            <label htmlFor="nome">Seu nome</label>
            <input id="nome" type="text" placeholder="Digite seu nome completo" value={clientName} onChange={(e) => setClientName(e.target.value)} autoComplete="name" />
          </div>

          <div className="form-group">
            <label>Escolha o serviço</label>
            <div className="services-grid">
              {SERVICES.map((s) => (
                <button key={s.id} type="button" className={`service-btn ${selectedService === s.id ? 'active' : ''}`} aria-pressed={selectedService === s.id} onClick={() => setSelectedService(s.id)}>
                  <span className="icon">{s.icon}</span>
                  <span className="info">
                    <span className="name">{s.name}</span>
                    <span className="price">{s.price}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="barbeiro">Barbeiro de preferência</label>
            <select id="barbeiro" value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)}>
              {BARBERS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Data e horário</label>
            <div className="date-time">
              <Calendar value={date} onSelect={pickDate} />
              <div>
                {!date && <p className="notice">Selecione um dia no calendário para ver os horários.</p>}
                {closed && (
                  <p className="notice warn" role="alert">
                    A barbearia não abre às segundas-feiras. Escolha um dia de terça a domingo.
                  </p>
                )}
                {date && !closed && (
                  <>
                    <h3 className="cap">{longDate(date)}</h3>
                    <div className="slots">
                      {SLOTS.map((t) => (
                        <button key={t} type="button" className={`slot ${t === time ? 'is-selected' : ''}`} disabled={!isAvailable(blocked, date, t)} aria-pressed={t === time} onClick={() => setTime(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {freeCount === 0 && <p className="notice warn">Não há horários livres neste dia. Tente outra data.</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          {ready && (
            <p className="recap">
              {serviceObj.name} com {selectedBarber}, <span className="cap-inline">{weekdayName(date)}</span> {shortDate(date)} às {time}.
            </p>
          )}

          <button type="submit" className="submit-btn" disabled={!ready}>
            📲 Agendar no WhatsApp
          </button>
          {missing && <p className="hint">{missing}</p>}
        </form>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Mano Theu Barbershop. Todos os direitos reservados.</p>
        <button type="button" className="link" onClick={openOwnerArea}>
          {isAdmin ? 'Abrir painel do proprietário' : 'Acesso do proprietário'}
        </button>
      </footer>

      {modal === 'login' && (
        <LoginModal
          onClose={() => setModal(null)}
          onSuccess={() => {
            setIsAdmin(true)
            setModal('admin')
          }}
        />
      )}
      {modal === 'admin' && isAdmin && (
        <AdminPanel
          blocked={blocked}
          setBlocked={setBlocked}
          onClose={() => setModal(null)}
          onLogout={() => {
            setIsAdmin(false)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

