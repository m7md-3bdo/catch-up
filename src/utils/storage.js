import { maxBackupSize, validateSchedule } from './validation.js'

const storageKey = 'catch-up.schedule.v1'
const textEncoder = new TextEncoder()

function emptySchedule() {
  return { version: 1, appointments: [], tasks: [] }
}

export function loadSchedule() {
  try {
    const savedText = localStorage.getItem(storageKey)
    if (!savedText) return { schedule: emptySchedule(), message: '' }
    const schedule = savedText.length <= maxBackupSize ? validateSchedule(JSON.parse(savedText)) : null
    if (schedule) return { schedule, message: '' }
    return { schedule: emptySchedule(), message: 'الجدول المحفوظ مش سليم. تقدر تبدأ من جديد أو تسترجع نسخة احتياطية.' }
  } catch {
    return { schedule: emptySchedule(), message: 'معرفناش نفتح الجدول المحفوظ. تقدر تسترجع نسخة احتياطية لو معاك واحدة.' }
  }
}

export async function changeSavedSchedule(changeSchedule) {
  function writeSchedule() {
    const changedSchedule = changeSchedule(loadSchedule().schedule)
    if (!changedSchedule) return { error: 'changed' }
    const schedule = validateSchedule(changedSchedule)
    if (!schedule) return { error: 'invalid' }
    const savedText = JSON.stringify(schedule)
    if (textEncoder.encode(savedText).length > maxBackupSize) return { error: 'limit' }
    localStorage.setItem(storageKey, savedText)
    return { schedule }
  }

  try {
    if (navigator.locks) return await navigator.locks.request(storageKey, writeSchedule)
    return writeSchedule()
  } catch {
    return { error: 'save' }
  }
}

export async function readBackup(file) {
  try {
    if (!file || file.size < 1 || file.size > maxBackupSize) return null
    return validateSchedule(JSON.parse(await file.text()))
  } catch {
    return null
  }
}

export function downloadBackup(schedule) {
  const json = JSON.stringify(schedule)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = 'catch-up-backup.json'
    document.body.append(link)
    link.click()
    link.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function watchSchedule(onChange) {
  function handleStorageChange(event) {
    if (event.key === storageKey || event.key === null) onChange(loadSchedule())
  }
  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}
