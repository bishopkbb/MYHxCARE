// ── Per-event payload types ───────────────────────────────────────────────

export type PatientAdmittedPayload = {
  patient_id: string;
  ward_id: string;
  bed_id: string;
  admitted_at: string;
};

export type PatientDischargedPayload = {
  patient_id: string;
  ward_id: string;
  discharged_at: string;
};

export type PatientTransferredPayload = {
  patient_id: string;
  from_ward_id: string;
  to_ward_id: string;
  to_bed_id: string;
  transferred_at: string;
};

export type LabResultReadyPayload = {
  order_id: string;
  patient_id: string;
  result_id: string;
  test_name: string;
  is_critical: boolean;
};

export type PrescriptionDispensedPayload = {
  prescription_id: string;
  patient_id: string;
  dispensed_at: string;
};

export type CriticalAlertPayload = {
  alert_id: string;
  patient_id: string;
  message: string;
  severity: 'critical' | 'urgent' | 'warning';
};

export type NewNotificationPayload = {
  notification_id: string;
  title: string;
  body: string;
  category: string;
};

// ── Typed event map (event name → payload) ────────────────────────────────

export type WsEventMap = {
  'patient.admitted': PatientAdmittedPayload;
  'patient.discharged': PatientDischargedPayload;
  'patient.transferred': PatientTransferredPayload;
  'lab.result_ready': LabResultReadyPayload;
  'prescription.dispensed': PrescriptionDispensedPayload;
  'alert.critical': CriticalAlertPayload;
  'notification.new': NewNotificationPayload;
};

// ── Wire format (what arrives over the WebSocket) ─────────────────────────

export type RawWsMessage = {
  type: keyof WsEventMap;
  payload: WsEventMap[keyof WsEventMap];
  timestamp: string;
};
