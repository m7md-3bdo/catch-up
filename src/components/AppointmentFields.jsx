import React from 'react'
import { maxDuration, maxNameLength, maxTravel } from '../utils/validation.js'

export default function AppointmentFields({ fields, updateField }) {
  return (
    <>
      <label className="field span-two">اسم المعاد
        <input name="name" className="form-control" value={fields.name} onChange={updateField}
          maxLength={maxNameLength} placeholder="مثال: درس تانية ثانوي" required />
      </label>
      <label className="field">المدة بالدقائق
        <input name="duration" type="number" inputMode="numeric" className="form-control" value={fields.duration}
          onChange={updateField} min="1" max={maxDuration} required />
      </label>
      <label className="field">وقت الطريق بالدقائق
        <input name="travel" type="number" inputMode="numeric" className="form-control" value={fields.travel}
          onChange={updateField} min="0" max={maxTravel} required />
      </label>
    </>
  )
}
