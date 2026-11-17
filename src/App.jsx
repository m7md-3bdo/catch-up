import React, { useEffect, useMemo, useRef, useState } from 'react'
import Today from './components/Today.jsx'
import Appointments from './components/Appointments.jsx'
import Tasks from './components/Tasks.jsx'
import { getTodayPlan, seriesIncludes } from './utils/time.js'
import { changeSavedSchedule, downloadBackup, loadSchedule, readBackup, watchSchedule } from './utils/storage.js'

const screens = [
  { id: 'today', label: 'النهارده' },
  { id: 'appointments', label: 'المواعيد' },
  { id: 'tasks', label: 'المهام' },
]
const saveMessages = {
  changed: 'العنصر اتغير أو اتحذف في تبويب تاني. افتح القائمة وجرب تاني.',
  invalid: 'معرفناش نحفظ التغيير. راجع المدخلات أو امسح شوية عناصر قديمة وجرب تاني.',
  limit: 'الجدول وصل للحد المسموح. صدّر نسخة وامسح شوية عناصر قديمة.',
  save: 'معرفناش نحفظ التغيير. اتأكد إن المتصفح بيسمح بالتخزين وجرب تاني.',
}

export default function App() {
  const [saved, setSaved] = useState(loadSchedule)
  const [screen, setScreen] = useState('today')
  const [now, setNow] = useState(Date.now)
  const [pendingBackup, setPendingBackup] = useState(null)
  const [readingBackup, setReadingBackup] = useState(false)
  const [message, setMessage] = useState('')
  const importInput = useRef(null)
  const { appointments, tasks } = saved.schedule

  useEffect(() => {
    function refreshClock() {
      setNow(Date.now())
    }
    const timer = window.setInterval(refreshClock, 1000)
    document.addEventListener('visibilitychange', refreshClock)
    window.addEventListener('focus', refreshClock)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshClock)
      window.removeEventListener('focus', refreshClock)
    }
  }, [])

  useEffect(() => watchSchedule(setSaved), [])

  const plan = useMemo(() => screen === 'today' ? getTodayPlan(appointments, tasks, now) : null,
    [appointments, tasks, now, screen])

  function openScreen(nextScreen) {
    setScreen(nextScreen)
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }

  async function updateSchedule(changeSchedule, successMessage = '') {
    const { schedule, error } = await changeSavedSchedule(changeSchedule)
    if (!schedule) {
      setMessage(saveMessages[error])
      return false
    }
    setSaved(loadSchedule())
    setMessage(successMessage)
    return true
  }

  function updateItems(listName, changeItems) {
    return updateSchedule(schedule => {
      const items = changeItems(schedule[listName])
      return items ? { ...schedule, [listName]: items } : null
    })
  }

  function saveTask(task, id) {
    return updateItems('tasks', items => {
      if (!id) return [...items, { ...task, id: crypto.randomUUID(), done: false }]
      if (!items.some(item => item.id === id)) return null
      return items.map(item => item.id === id ? { ...item, ...task } : item)
    })
  }

  function toggleTask(id) {
    return updateItems('tasks', items => {
      if (!items.some(item => item.id === id)) return null
      return items.map(item => item.id === id ? { ...item, done: !item.done } : item)
    })
  }

  function saveAppointment(appointment, previousAppointment) {
    return updateItems('appointments', items => {
      if (!previousAppointment) return [...items, { ...appointment, id: crypto.randomUUID() }]
      const { id } = previousAppointment
      const latestAppointment = items.find(item => item.id === id)
      if (!latestAppointment || JSON.stringify(latestAppointment) !== JSON.stringify(previousAppointment)) return null
      return items.map(item => item.id === id ? { ...appointment, id } : item)
    })
  }

  function saveException(seriesId, date, exception) {
    return updateItems('appointments', items => {
      const series = items.find(item => item.id === seriesId && item.kind === 'weekly')
      if (!series || !seriesIncludes(series, date)) return null
      return items.map(item => {
        if (item.id !== seriesId) return item
        const exceptions = item.exceptions.filter(oldException => oldException.date !== date)
        if (exception) exceptions.push(exception)
        return { ...item, exceptions }
      })
    })
  }

  function deleteItem(listName, id) {
    return updateItems(listName, items => items.filter(item => item.id !== id))
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReadingBackup(true)
    setPendingBackup(null)
    const backup = await readBackup(file)
    setReadingBackup(false)
    setPendingBackup(backup)
    setMessage(backup ? '' : 'الملف مش نسخة احتياطية سليمة من الحق ايه. بياناتك زي ما هي.')
  }

  async function restoreBackup() {
    if (pendingBackup && await updateSchedule(() => pendingBackup, 'تم استرجاع النسخة الاحتياطية.')) {
      setPendingBackup(null)
      setScreen('today')
    }
  }

  function exportFile() {
    try {
      downloadBackup(saved.schedule)
      setMessage('النسخة الاحتياطية نزلت في التنزيلات.')
    } catch {
      setMessage('معرفناش ننزّل النسخة الاحتياطية. جرب تاني.')
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button type="button" className="brand" onClick={() => openScreen('today')}>
            <span className="brand-mark" aria-hidden="true" />
            <span>الحق ايه</span>
          </button>
          <div className="backup-actions" aria-label="النسخة الاحتياطية">
            <button type="button" className="btn btn-text btn-sm" onClick={exportFile}>تصدير</button>
            <button type="button" className="btn btn-text btn-sm" disabled={readingBackup}
              onClick={() => importInput.current?.click()}>استيراد</button>
            <input ref={importInput} className="d-none" type="file" accept=".json,application/json" onChange={importFile} />
          </div>
        </div>
      </header>
      <div className="app-content">
        <nav className="app-nav" aria-label="التنقل الرئيسي">
          {screens.map(item => (
            <button type="button" key={item.id} className="nav-button" aria-current={screen === item.id ? 'page' : undefined}
              onClick={() => openScreen(item.id)}>{item.label}</button>
          ))}
        </nav>
        <main id="main-content" tabIndex="-1">
          {(message || saved.message) && <div className="notice" role="status">
            {message || saved.message}
            {message && <button type="button" className="btn btn-text btn-sm" onClick={() => setMessage('')}>إخفاء</button>}
          </div>}
          {pendingBackup && <section className="notice restore-box" aria-label="استرجاع نسخة احتياطية">
            <p>الملف فيه {pendingBackup.appointments.length} معاد و{pendingBackup.tasks.length} مهمة. الاسترجاع هيستبدل جدولك الحالي.</p>
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={restoreBackup}>استرجاع النسخة</button>
              <button type="button" className="btn btn-outline-light" onClick={() => setPendingBackup(null)}>رجوع</button>
            </div>
          </section>}
          {screen === 'today' && <Today plan={plan} now={now} openAppointments={() => openScreen('appointments')}
            openTasks={() => openScreen('tasks')} toggleTask={toggleTask} />}
          {screen === 'appointments' && <Appointments appointments={appointments} now={now} saveAppointment={saveAppointment}
            saveException={saveException} deleteAppointment={id => deleteItem('appointments', id)} />}
          {screen === 'tasks' && <Tasks tasks={tasks} saveTask={saveTask} toggleTask={toggleTask}
            deleteTask={id => deleteItem('tasks', id)} />}
        </main>
      </div>
    </div>
  )
}
