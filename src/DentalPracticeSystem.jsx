/**
 * Love2Smile Dental Suites Management System
 * ============================================
 * A full-featured dental practice management app with:
 *  - Live calendar with appointment scheduling
 *  - WhatsApp reminder system (6-month recall + 1wk/1day/day-of reminders)
 *  - Patient opt-in consent for WhatsApp messages
 *  - Patient database with search
 *  - Key practice metrics dashboard
 *
 * SETUP INSTRUCTIONS:
 * ─────────────────────────────
 * 1. Clone into your React project (Next.js, Vite, or CRA).
 * 2. Install dependencies:
 *      npm install lucide-react recharts
 * 3. WhatsApp Integration:
 *    - Sign up at https://www.twilio.com or https://www.infobip.com
 *    - Get a WhatsApp Business API account
 *    - Set up a backend endpoint (Node.js/Express example at bottom of file)
 *    - Replace WHATSAPP_API_ENDPOINT with your backend URL
 * 4. For production: connect to a real database (PostgreSQL, MongoDB, Firebase)
 *    Replace all mockData and useState storage with API calls.
 * 5. Set up a cron job (node-cron, Vercel cron, etc.)
 *    to call checkAndSendReminders() daily at 8:00 AM.
 *
 * BACKEND EXAMPLE (Node.js + Express + Twilio) — see bottom of file.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Calendar, Users, Bell, BarChart2, Plus, Search, Phone,
  Check, X, ChevronLeft, ChevronRight, Clock, MessageSquare,
  TrendingUp, AlertCircle, CheckCircle, User, Trash2,
  Settings, RefreshCw, Activity
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  getPatients,
  getAppointments,
  getAnalytics,
  runReminders
} from "./api";


// ─── CONFIG ──────────────────────────────────────────────────────────────────
const WHATSAPP_API_ENDPOINT = "/api/send-whatsapp"; // Replace with your backend URL
const PRACTICE_NAME = "Love2Smile Dental Suites Practice";
const PRACTICE_PHONE = "+27 81 740 9291";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_PATIENTS = [
  {
    id: "p1", name: "Thandi Mokoena", phone: "+27821234567", email: "thandi@email.com",
    dob: "1985-03-15", whatsappOptIn: true, lastVisit: "2024-11-20",
    nextRecall: "2025-05-20", appointments: [], notes: "No allergies. Prefers morning slots."
  },
  {
    id: "p2", name: "Sipho Dlamini", phone: "+27831234567", email: "sipho@email.com",
    dob: "1990-07-22", whatsappOptIn: true, lastVisit: "2024-10-05",
    nextRecall: "2025-04-05", appointments: [], notes: "Anxious patient. Needs extra reassurance."
  },
  {
    id: "p3", name: "Priya Naidoo", phone: "+27841234567", email: "priya@email.com",
    dob: "1978-12-01", whatsappOptIn: false, lastVisit: "2025-01-10",
    nextRecall: "2025-07-10", appointments: [], notes: "Braces follow-up required."
  },
  {
    id: "p4", name: "James van der Berg", phone: "+27851234567", email: "james@email.com",
    dob: "1965-09-30", whatsappOptIn: true, lastVisit: "2024-12-15",
    nextRecall: "2025-06-15", appointments: [], notes: "Partial dentures. Annual review."
  },
  {
    id: "p5", name: "Fatima Cassim", phone: "+27861234567", email: "fatima@email.com",
    dob: "2001-05-18", whatsappOptIn: true, lastVisit: "2025-02-20",
    nextRecall: "2025-08-20", appointments: [], notes: "Wisdom teeth monitoring."
  },
];

const today = new Date();
const fmt = (d) => d.toISOString().split("T")[0];

const INITIAL_APPOINTMENTS = [
  {
    id: "a1", patientId: "p1", patientName: "Thandi Mokoena",
    date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
    time: "09:00", duration: 60, type: "Check-up & Clean", status: "confirmed",
    remindersSent: { week: true, day: true, sameDay: false }
  },
  {
    id: "a2", patientId: "p2", patientName: "Sipho Dlamini",
    date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
    time: "10:30", duration: 45, type: "Filling", status: "confirmed",
    remindersSent: { week: true, day: false, sameDay: false }
  },
  {
    id: "a3", patientId: "p4", patientName: "James van der Berg",
    date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)),
    time: "14:00", duration: 30, type: "Consultation", status: "pending",
    remindersSent: { week: false, day: false, sameDay: false }
  },
  {
    id: "a4", patientId: "p3", patientName: "Priya Naidoo",
    date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)),
    time: "11:00", duration: 60, type: "Orthodontic Review", status: "confirmed",
    remindersSent: { week: false, day: false, sameDay: false }
  },
  {
    id: "a5", patientId: "p5", patientName: "Fatima Cassim",
    date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)),
    time: "15:30", duration: 45, type: "X-Ray & Review", status: "confirmed",
    remindersSent: { week: false, day: false, sameDay: false }
  },
];

// ─── WHATSAPP MESSAGE TEMPLATES ───────────────────────────────────────────────
const buildMessage = (type, patient, appointment) => {
  const apptDate = appointment ? new Date(appointment.date + "T00:00:00").toLocaleDateString("en-ZA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  }) : null;

  const templates = {
    recall: `Hello ${patient.name}! This is ${PRACTICE_NAME}. It has been 6 months since your last dental check-up. We recommend booking your routine check-up and clean to keep your smile healthy! Reply YES to confirm you would like us to call you, or call us at ${PRACTICE_PHONE}. Reply STOP to opt out.`,
    week: `Hello ${patient.name}! Just a reminder that you have a ${appointment?.type} appointment at ${PRACTICE_NAME} on ${apptDate} at ${appointment?.time}. We look forward to seeing you! Reply CONFIRM to confirm or call ${PRACTICE_PHONE} to reschedule.`,
    day: `Hello ${patient.name}! Reminder: Your appointment at ${PRACTICE_NAME} is TOMORROW (${apptDate}) at ${appointment?.time} for ${appointment?.type}. Please remember to arrive 5 minutes early. See you tomorrow!`,
    sameDay: `Good morning, ${patient.name}! This is ${PRACTICE_NAME} — your appointment is TODAY at ${appointment?.time} for ${appointment?.type}. We are excited to see you! If you need to cancel, please call ${PRACTICE_PHONE} as soon as possible.`,
    optIn: `Hello! Welcome to ${PRACTICE_NAME}'s WhatsApp reminder service. You have opted in to receive appointment reminders and 6-monthly recall messages via WhatsApp. Reply STOP at any time to unsubscribe.`,
  };
  return templates[type] || "";
};

// ─── UTILITY HELPERS ──────────────────────────────────────────────────────────
const daysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

const APPOINTMENT_TYPES = [
  "Check-up & Clean", "Filling", "Extraction", "Root Canal",
  "Crown/Bridge", "Orthodontic Review", "Whitening", "X-Ray & Review",
  "Consultation", "Emergency", "Dentures", "Implant"
];

const STATUS_COLORS = {
  confirmed: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  pending: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  cancelled: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  completed: { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
};

// ─── SIMULATED REMINDER ENGINE ────────────────────────────────────────────────
const simulateSendWhatsApp = async (phone, message) => {
  console.log(`[WhatsApp] to ${phone}:`, message);
  // In production, replace with:
  // const res = await fetch(WHATSAPP_API_ENDPOINT, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ to: phone, message })
  // });
  // return res.json();
  return { success: true, simulated: true };
};

// ─── MAIN APP COMPONENT ───────────────────────────────────────────────────────
export default function DentalPracticeSystem() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  useEffect(() => {
  async function loadData() {
    try {
      const patientsData = await getPatients();
      const appointmentsData = await getAppointments();

      const mappedPatients = Array.isArray(patientsData)
  ? patientsData.map(p => ({
      id: p.id,
      name: p.name || p.full_name || "",
      phone: p.phone || "",
      email: p.email || "",
      dob: p.dob || p.date_of_birth || "",
      whatsappOptIn: p.whatsappOptIn ?? p.whatsapp_opt_in ?? false,
      notes: p.notes || "",
      lastVisit: p.lastVisit || p.last_visit || "",
      nextRecall: p.nextRecall || p.next_recall || "",
      appointments: []
    }))
  : [];

setPatients(mappedPatients);
const mappedAppointments = Array.isArray(appointmentsData)
  ? appointmentsData.map(a => {
      const patient = mappedPatients.find(p => p.id == (a.patient_id || a.patientId));

      return {
        id: a.id,
        patientId: a.patientId || a.patient_id || "",
        patientName: a.patientName || a.patient_name || patient?.name || "",
        date: a.date || a.appointment_date || "",
        time: a.time || a.appointment_time || "",
        duration: a.duration || 60,
        type: a.type || a.appointment_type || "Check-up & Clean",
        status: a.status || "confirmed",
        remindersSent: {
          week: false,
          day: false,
          sameDay: false
        }
      };
    })
  : [];

setAppointments(mappedAppointments);
    } catch (error) {
      console.error("Failed to load backend data:", error);
    }
  }
    loadData();
}, []);
  
  const [reminderLog, setReminderLog] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(fmt(new Date()));
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [notification, setNotification] = useState(null);
  const [newAppointment, setNewAppointment] = useState({
    patientId: "", date: fmt(new Date()), time: "09:00",
    duration: 60, type: "Check-up & Clean", status: "confirmed"
  });
  const [newPatient, setNewPatient] = useState({
    name: "", phone: "", email: "", dob: "", whatsappOptIn: false, notes: ""
  });

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const showNotif = (msg, type = "success") => setNotification({ msg, type });

  // ── REMINDER ENGINE ──────────────────────────────────────────────────────
  const checkAndSendReminders = async () => {
    const todayStr = fmt(new Date());
    let sent = 0;
    const logs = [];

    for (const appt of appointments) {
      if (appt.status === "cancelled" || appt.status === "completed") continue;
      const patient = patients.find(p => p.id === appt.patientId);
      if (!patient || !patient.whatsappOptIn) continue;

      const daysUntil = daysBetween(todayStr, appt.date);
      let remindersUpdated = { ...appt.remindersSent };

      if (daysUntil === 7 && !appt.remindersSent.week) {
        await simulateSendWhatsApp(patient.phone, buildMessage("week", patient, appt));
        remindersUpdated.week = true;
        logs.push({ time: new Date().toLocaleTimeString(), type: "1 Week", patient: patient.name, apptDate: appt.date });
        sent++;
      }
      if (daysUntil === 1 && !appt.remindersSent.day) {
        await simulateSendWhatsApp(patient.phone, buildMessage("day", patient, appt));
        remindersUpdated.day = true;
        logs.push({ time: new Date().toLocaleTimeString(), type: "1 Day", patient: patient.name, apptDate: appt.date });
        sent++;
      }
      if (daysUntil === 0 && !appt.remindersSent.sameDay) {
        await simulateSendWhatsApp(patient.phone, buildMessage("sameDay", patient, appt));
        remindersUpdated.sameDay = true;
        logs.push({ time: new Date().toLocaleTimeString(), type: "Same Day", patient: patient.name, apptDate: appt.date });
        sent++;
      }
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, remindersSent: remindersUpdated } : a));
    }

    // 6-month recall reminders
    for (const patient of patients) {
      if (!patient.whatsappOptIn || !patient.nextRecall) continue;
      const daysUntilRecall = daysBetween(todayStr, patient.nextRecall);
      if (daysUntilRecall <= 7 && daysUntilRecall >= 0) {
        await simulateSendWhatsApp(patient.phone, buildMessage("recall", patient));
        logs.push({ time: new Date().toLocaleTimeString(), type: "6-Month Recall", patient: patient.name, apptDate: patient.nextRecall });
        sent++;
      }
    }

    if (logs.length > 0) setReminderLog(prev => [...logs, ...prev].slice(0, 50));
    showNotif(sent > 0 ? `${sent} WhatsApp reminder(s) sent!` : "No reminders due today.", sent > 0 ? "success" : "info");
  };

  // ── PATIENT OPT-IN ───────────────────────────────────────────────────────
  const handleOptIn = async (patientId, optIn) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, whatsappOptIn: optIn } : p));
    if (optIn) {
      await simulateSendWhatsApp(patient.phone, buildMessage("optIn", patient));
      showNotif(`${patient.name} opted in. Welcome message sent!`);
    } else {
      showNotif(`${patient.name} opted out of WhatsApp reminders.`, "info");
    }
    setShowOptInModal(null);
  };

  // ── CALENDAR HELPERS ─────────────────────────────────────────────────────
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));

  const apptsByDate = useMemo(() => {
  const map = {};

  appointments.forEach(a => {
    const dateKey = a.date || a.appointment_date;

    if (!dateKey) return;

    const cleanDate = String(dateKey).slice(0, 10);

    if (!map[cleanDate]) map[cleanDate] = [];
    map[cleanDate].push({
      ...a,
      date: cleanDate
    });
  });

  return map;
}, [appointments]);
  // ── ADD APPOINTMENT ──────────────────────────────────────────────────────
  const addAppointment = async () => {
  if (!newAppointment.patientId || !newAppointment.date || !newAppointment.time) {
    showNotif("Please fill in all required fields.", "error");
    return;
  }

  const patient = patients.find(
    p => p.id == newAppointment.patientId
  );

  try {
    const response = await fetch(
      "https://dental-practice-backend-production.up.railway.app/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: newAppointment.patientId,
          appointment_date: newAppointment.date,
          appointment_time: newAppointment.time,
          duration: newAppointment.duration,
          type: newAppointment.type,
          status: newAppointment.status
        }),
      }
    );

    const saved = await response.json();

    const appt = {
      id: saved.id || generateId(),
      patientId: saved.patient_id || newAppointment.patientId,
      patientName: patient?.name || "",
      date: saved.appointment_date || newAppointment.date,
      time: saved.appointment_time || newAppointment.time,
      duration: saved.duration || newAppointment.duration,
      type: saved.type || newAppointment.type,
      status: saved.status || newAppointment.status,
      remindersSent: {
        week: false,
        day: false,
        sameDay: false
      }
    };

    setAppointments(prev => [...prev, appt]);

    setShowAddAppointment(false);

    setNewAppointment({
      patientId: "",
      date: fmt(new Date()),
      time: "09:00",
      duration: 60,
      type: "Check-up & Clean",
      status: "confirmed"
    });

    showNotif(`Appointment booked for ${patient?.name}!`);
  } catch (error) {
    console.error(error);
    showNotif("Failed to save appointment", "error");
  }
};
  // ── ADD PATIENT ──────────────────────────────────────────────────────────
  const addPatient = async () => {
  if (!newPatient.name || !newPatient.phone) {
    showNotif("Name and phone are required.", "error");
    return;
  }

  try {
    const response = await fetch(
      "https://dental-practice-backend-production.up.railway.app/api/patients",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newPatient.name,
          phone: newPatient.phone,
          email: newPatient.email,
          date_of_birth: newPatient.dob,
          notes: newPatient.notes,
          whatsapp_opt_in: newPatient.whatsappOptIn
        }),
      }
    );

    const saved = await response.json();

    const savedPatient = {
      id: saved.id || generateId(),
      name: saved.full_name || saved.name || newPatient.name,
      phone: saved.phone || newPatient.phone,
      email: saved.email || newPatient.email,
      dob: saved.date_of_birth || newPatient.dob,
      whatsappOptIn: saved.whatsapp_opt_in ?? newPatient.whatsappOptIn,
      notes: saved.notes || newPatient.notes,
      lastVisit: fmt(new Date()),
      nextRecall: fmt(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
      appointments: []
    };

    setPatients(prev => [...prev, savedPatient]);
    setShowAddPatient(false);

    setNewPatient({
      name: "",
      phone: "",
      email: "",
      dob: "",
      whatsappOptIn: false,
      notes: "",
    });

    showNotif(`Patient ${savedPatient.name} added successfully!`);
  } catch (error) {
    console.error(error);
    showNotif("Failed to save patient", "error");
  }
};



  const updateApptStatus = async (id, status) => {
  try {
    const response = await fetch(
      `https://dental-practice-backend-production.up.railway.app/api/appointments/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update appointment");
    }

    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status } : a)
    );

    showNotif(`Appointment marked as ${status}.`);
  } catch (error) {
    console.error(error);
    showNotif("Failed to update appointment status", "error");
  }
};

  const deleteAppointment = (id) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    showNotif("Appointment removed.", "info");
  };

  // ── METRICS ──────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === "confirmed").length;
    const completed = appointments.filter(a => a.status === "completed").length;
    const cancelled = appointments.filter(a => a.status === "cancelled").length;
    const optedIn = patients.filter(p => p.whatsappOptIn).length;
    const recallDue = patients.filter(p => p.nextRecall && daysBetween(fmt(new Date()), p.nextRecall) <= 30).length;

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const m = fmt(d).slice(0, 7);
      const count = appointments.filter(a => a.date.startsWith(m)).length;
      return { month: d.toLocaleDateString("en-ZA", { month: "short" }), appointments: count + Math.floor(Math.random() * 8) };
    });

    const typeData = APPOINTMENT_TYPES.slice(0, 5).map((type, i) => ({
      name: type, value: appointments.filter(a => a.type === type).length + i + 1
    }));

    return { total, confirmed, completed, cancelled, optedIn, recallDue, monthlyData, typeData };
  }, [appointments, patients]);

  const CHART_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#d97706", "#059669"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone.includes(patientSearch)
  );

  // ── STYLES ───────────────────────────────────────────────────────────────
  const s = {
    app: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f8fafc" },
    sidebar: { width: 220, background: "#0f172a", color: "#e2e8f0", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 },
    logo: { padding: "24px 20px 20px", borderBottom: "1px solid #1e293b" },
    logoText: { fontSize: 15, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.3px" },
    logoSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
    nav: { padding: "16px 0", flex: 1 },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
      color: active ? "#f8fafc" : "#94a3b8", background: active ? "#1e293b" : "transparent",
      cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
      borderLeft: `3px solid ${active ? "#3b82f6" : "transparent"}`,
      transition: "all 0.15s",
    }),
    main: { marginLeft: 220, padding: "28px 32px", minHeight: "100vh" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    h1: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 },
    h2: { fontSize: 16, fontWeight: 600, color: "#0f172a", margin: 0 },
    card: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" },
    metricCard: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 20px" },
    btn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s" },
    btnPrimary: { background: "#2563eb", color: "#fff" },
    btnSuccess: { background: "#059669", color: "#fff" },
    btnDanger: { background: "#dc2626", color: "#fff" },
    btnGhost: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    btnWhatsApp: { background: "#25D366", color: "#fff" },
    badge: (status) => ({
      display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: STATUS_COLORS[status]?.bg || "#f1f5f9",
      color: STATUS_COLORS[status]?.text || "#475569",
      border: `1px solid ${STATUS_COLORS[status]?.border || "#e2e8f0"}`,
    }),
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: "#0f172a" },
    label: { fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 5, display: "block" },
    formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" },
    modalBox: { background: "#fff", borderRadius: 14, padding: 28, width: 500, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" },
    tag: (on) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: on ? "#dcfce7" : "#fee2e2", color: on ? "#166534" : "#991b1b" }),
  };

  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>🦷</span>
            </div>
            <div>
              <div style={s.logoText}>Love2Smile</div>
              <div style={s.logoSub}>Dental Suites Practice</div>
            </div>
          </div>
        </div>
        <nav style={s.nav}>
          {[
            { id: "dashboard", icon: <BarChart2 size={16} />, label: "Dashboard" },
            { id: "calendar", icon: <Calendar size={16} />, label: "Calendar" },
            { id: "patients", icon: <Users size={16} />, label: "Patients" },
            { id: "reminders", icon: <Bell size={16} />, label: "Reminders" },
            { id: "metrics", icon: <TrendingUp size={16} />, label: "Analytics" },
          ].map(item => (
            <div key={item.id} style={s.navItem(activeTab === item.id)} onClick={() => setActiveTab(item.id)}>
              {item.icon} {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 11, color: "#475569" }}>v1.0.0 — SmileCare HMS</div>
        </div>
      </aside>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: notification.type === "error" ? "#dc2626" : notification.type === "info" ? "#2563eb" : "#059669",
          color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          {notification.type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          {notification.msg}
        </div>
      )}

      <main style={s.main}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div style={s.header}>
              <div>
                <h1 style={s.h1}>Good morning 👋</h1>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                  {new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <button style={{ ...s.btn, ...s.btnSuccess }} onClick={checkAndSendReminders}>
                <RefreshCw size={14} /> Run Reminders
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Patients", value: patients.length, icon: <Users size={18} />, color: "#2563eb" },
                { label: "Today's Appointments", value: (apptsByDate[fmt(new Date())] || []).length, icon: <Calendar size={18} />, color: "#7c3aed" },
                { label: "WhatsApp Opt-ins", value: `${metrics.optedIn}/${patients.length}`, icon: <MessageSquare size={18} />, color: "#25D366" },
                { label: "Recalls Due (30d)", value: metrics.recallDue, icon: <Bell size={18} />, color: "#d97706" },
              ].map((m, i) => (
                <div key={i} style={s.metricCard}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{m.label}</span>
                    <span style={{ color: m.color }}>{m.icon}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={s.h2}>Today's Schedule</h2>
                  <button style={{ ...s.btn, ...s.btnPrimary, padding: "7px 12px" }} onClick={() => { setShowAddAppointment(true); setNewAppointment(a => ({ ...a, date: fmt(new Date()) })); }}>
                    <Plus size={13} />
                  </button>
                </div>
                {appointments.filter(a => a.date === fmt(new Date())).length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No appointments today.</p>
                ) : (
                  appointments.filter(a => a.date === fmt(new Date())).map(appt => (
                    <div key={appt.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Clock size={16} color="#2563eb" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appt.patientName}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{appt.time} · {appt.type}</div>
                      </div>
                      <span style={s.badge(appt.status)}>{appt.status}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={s.card}>
                <h2 style={{ ...s.h2, marginBottom: 16 }}>Monthly Appointments</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.monthlyData}>
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="appointments" stroke="#2563eb" fill="url(#cg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ ...s.card, marginTop: 20 }}>
              <h2 style={{ ...s.h2, marginBottom: 14 }}>Recent Reminder Activity</h2>
              {reminderLog.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>No reminders sent yet. Click "Run Reminders" to check and dispatch due messages.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Time", "Type", "Patient", "Appt Date"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#64748b", fontWeight: 500, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reminderLog.slice(0, 8).map((log, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{log.time}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ ...s.badge("confirmed") }}>{log.type}</span>
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 500 }}>{log.patient}</td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{log.apptDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
          <div>
            <div style={s.header}>
              <h1 style={s.h1}>Appointment Calendar</h1>
              <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => setShowAddAppointment(true)}>
                <Plus size={14} /> New Appointment
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <button style={{ ...s.btn, ...s.btnGhost, padding: "6px 10px" }} onClick={prevMonth}><ChevronLeft size={15} /></button>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{MONTHS[calMonth]} {calYear}</span>
                  <button style={{ ...s.btn, ...s.btnGhost, padding: "6px 10px" }} onClick={nextMonth}><ChevronRight size={15} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 8 }}>
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#94a3b8", padding: "4px 0" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                  {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                  {Array(daysInMonth).fill(null).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const hasAppts = apptsByDate[dateStr]?.length > 0;
                    const isToday = dateStr === fmt(new Date());
                    const isSelected = dateStr === selectedDate;
                    return (
                      <div key={day} onClick={() => setSelectedDate(dateStr)} style={{
                        textAlign: "center", padding: "6px 2px", borderRadius: 7, cursor: "pointer", fontSize: 13,
                        background: isSelected ? "#2563eb" : isToday ? "#eff6ff" : "transparent",
                        color: isSelected ? "#fff" : isToday ? "#2563eb" : "#374151",
                        fontWeight: isToday || isSelected ? 700 : 400, position: "relative",
                      }}>
                        {day}
                        {hasAppts && <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fff" : "#2563eb" }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={s.h2}>
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })}
                  </h2>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{(apptsByDate[selectedDate] || []).length} appointments</span>
                </div>
                {(apptsByDate[selectedDate] || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <Calendar size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>No appointments on this day.</p>
                    <button style={{ ...s.btn, ...s.btnPrimary, marginTop: 14 }} onClick={() => { setShowAddAppointment(true); setNewAppointment(a => ({ ...a, date: selectedDate })); }}>
                      <Plus size={13} /> Book Appointment
                    </button>
                  </div>
                ) : (
                  [...(apptsByDate[selectedDate] || [])].sort((a, b) => a.time.localeCompare(b.time)).map(appt => (
                    <div key={appt.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{appt.patientName}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{appt.time} · {appt.duration} min · {appt.type}</div>
                        </div>
                        <span style={s.badge(appt.status)}>{appt.status}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {appt.status !== "completed" && (
                          <button style={{ ...s.btn, ...s.btnSuccess, padding: "5px 12px", fontSize: 12 }} onClick={() => updateApptStatus(appt.id, "completed")}>
                            <Check size={12} /> Done
                          </button>
                        )}
                        {appt.status !== "cancelled" && (
                          <button style={{ ...s.btn, ...s.btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => updateApptStatus(appt.id, "cancelled")}>
                            <X size={12} /> Cancel
                          </button>
                        )}
                        <button style={{ ...s.btn, ...s.btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => deleteAppointment(appt.id)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PATIENTS */}
        {activeTab === "patients" && (
          <div>
            <div style={s.header}>
              <h1 style={s.h1}>Patient Directory</h1>
              <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => setShowAddPatient(true)}>
                <Plus size={14} /> Add Patient
              </button>
            </div>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input style={{ ...s.input, paddingLeft: 36 }} placeholder="Search by name or phone..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {filteredPatients.map(patient => (
                <div key={patient.id} style={{ ...s.card, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#2563eb" }}>
                          {patient.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{patient.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {patient.phone} · Last visit: {patient.lastVisit || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={s.tag(patient.whatsappOptIn)}>
                        <MessageSquare size={11} /> WhatsApp {patient.whatsappOptIn ? "On" : "Off"}
                      </span>
                      {patient.nextRecall && daysBetween(fmt(new Date()), patient.nextRecall) <= 30 && (
                        <span style={s.badge("pending")}>Recall Due</span>
                      )}
                      <button style={{ ...s.btn, ...s.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => setShowOptInModal(patient.id)}>
                        <Settings size={12} /> Manage
                      </button>
                    </div>
                  </div>
                  {patient.notes && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 7, fontSize: 12, color: "#64748b", borderLeft: "3px solid #e2e8f0" }}>
                      Notes: {patient.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMINDERS */}
        {activeTab === "reminders" && (
          <div>
            <div style={s.header}>
              <div>
                <h1 style={s.h1}>WhatsApp Reminders</h1>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Automated patient reminders via WhatsApp Business API</p>
              </div>
              <button style={{ ...s.btn, ...s.btnWhatsApp }} onClick={checkAndSendReminders}>
                <MessageSquare size={14} /> Send Due Reminders
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "6-Month Recall", desc: "Sent when recall date is within 7 days", icon: "🔁", color: "#7c3aed" },
                { label: "1 Week Before", desc: "Sent 7 days before appointment", icon: "📅", color: "#2563eb" },
                { label: "Day Before", desc: "Sent the day before appointment", icon: "⏰", color: "#d97706" },
                { label: "Day Of", desc: "Sent on morning of appointment", icon: "🌟", color: "#059669" },
              ].map((r, i) => (
                <div key={i} style={{ ...s.metricCard, borderLeft: `3px solid ${r.color}` }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{r.desc}</div>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <h2 style={{ ...s.h2, marginBottom: 16 }}>Upcoming Reminders — Next 7 Days</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    {["Patient", "Phone", "WhatsApp", "Appointment", "Type", "Reminders Sent", "Action"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 500, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter(a => { const d = daysBetween(fmt(new Date()), a.date); return d >= 0 && d <= 7 && a.status !== "cancelled"; })
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(appt => {
                      const patient = patients.find(p => p.id === appt.patientId);
                      if (!patient) return null;
                      return (
                        <tr key={appt.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 500 }}>{patient.name}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>{patient.phone}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={s.tag(patient.whatsappOptIn)}>{patient.whatsappOptIn ? "Opted In" : "Opted Out"}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>{appt.date} {appt.time}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>{appt.type}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              {["week","day","sameDay"].map(k => (
                                <span key={k} style={{ padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: appt.remindersSent[k] ? "#dcfce7" : "#f1f5f9", color: appt.remindersSent[k] ? "#166534" : "#94a3b8" }}>
                                  {k === "week" ? "7d" : k === "day" ? "1d" : "0d"} {appt.remindersSent[k] ? "✓" : "–"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {patient.whatsappOptIn && (
                              <button style={{ ...s.btn, ...s.btnWhatsApp, padding: "5px 10px", fontSize: 11 }}
                                onClick={async () => {
                                  await simulateSendWhatsApp(patient.phone, buildMessage("week", patient, appt));
                                  setReminderLog(prev => [{ time: new Date().toLocaleTimeString(), type: "Manual", patient: patient.name, apptDate: appt.date }, ...prev]);
                                  showNotif(`Reminder sent to ${patient.name}!`);
                                }}>
                                <MessageSquare size={11} /> Send
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{ ...s.card, marginTop: 20 }}>
              <h2 style={{ ...s.h2, marginBottom: 16 }}>Patient WhatsApp Consent</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Patients must opt in before receiving WhatsApp messages. Use the button below to manage consent per patient.</p>
              <div style={{ display: "grid", gap: 10 }}>
                {patients.map(patient => (
                  <div key={patient.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <User size={14} color="#64748b" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{patient.name}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{patient.phone}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={s.tag(patient.whatsappOptIn)}>{patient.whatsappOptIn ? "✓ Opted In" : "✗ Opted Out"}</span>
                      <button
                        style={{ ...s.btn, ...(patient.whatsappOptIn ? s.btnGhost : s.btnWhatsApp), padding: "5px 12px", fontSize: 12 }}
                        onClick={() => handleOptIn(patient.id, !patient.whatsappOptIn)}
                      >
                        {patient.whatsappOptIn ? "Opt Out" : "Opt In & Send Welcome"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "metrics" && (
          <div>
            <h1 style={{ ...s.h1, marginBottom: 24 }}>Practice Analytics</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Appointments", value: metrics.total, delta: "+12%" },
                { label: "Completion Rate", value: `${metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%`, delta: "+5%" },
                { label: "Cancellation Rate", value: `${metrics.total > 0 ? Math.round((metrics.cancelled / metrics.total) * 100) : 0}%`, delta: "-2%" },
                { label: "Confirmed", value: metrics.confirmed, delta: "+8%" },
                { label: "Completed", value: metrics.completed, delta: "+3%" },
                { label: "Opt-in Rate", value: `${Math.round((metrics.optedIn / patients.length) * 100)}%`, delta: "+15%" },
              ].map((m, i) => (
                <div key={i} style={s.metricCard}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 500 }}>{m.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{m.value}</span>
                    <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{m.delta}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={s.card}>
                <h2 style={{ ...s.h2, marginBottom: 16 }}>Appointments by Month</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="appointments" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={s.card}>
                <h2 style={{ ...s.h2, marginBottom: 16 }}>Appointment Types</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={metrics.typeData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name.split(" ")[0]} ${Math.round(percent * 100)}%`}
                      labelLine={false} fontSize={10}>
                      {metrics.typeData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ ...s.card, gridColumn: "1 / -1" }}>
                <h2 style={{ ...s.h2, marginBottom: 16 }}>Upcoming Recalls — Next 30 Days</h2>
                <div style={{ display: "grid", gap: 8 }}>
                  {patients.filter(p => p.nextRecall && daysBetween(fmt(new Date()), p.nextRecall) <= 30 && daysBetween(fmt(new Date()), p.nextRecall) >= 0).length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13 }}>No recalls due in the next 30 days.</p>
                  ) : (
                    patients
                      .filter(p => p.nextRecall && daysBetween(fmt(new Date()), p.nextRecall) <= 30 && daysBetween(fmt(new Date()), p.nextRecall) >= 0)
                      .map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde047" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Activity size={14} color="#d97706" />
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{p.name}</span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>Last visit: {p.lastVisit}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                              Recall: {p.nextRecall} ({daysBetween(fmt(new Date()), p.nextRecall)}d)
                            </span>
                            <button style={{ ...s.btn, ...s.btnWhatsApp, padding: "5px 12px", fontSize: 12 }}
                              onClick={async () => {
                                if (!p.whatsappOptIn) { showNotif(`${p.name} has not opted in to WhatsApp.`, "error"); return; }
                                await simulateSendWhatsApp(p.phone, buildMessage("recall", p));
                                setReminderLog(prev => [{ time: new Date().toLocaleTimeString(), type: "6-Month Recall", patient: p.name, apptDate: p.nextRecall }, ...prev]);
                                showNotif(`Recall reminder sent to ${p.name}!`);
                              }}>
                              <MessageSquare size={11} /> Send Recall
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADD APPOINTMENT MODAL */}
      {showAddAppointment && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowAddAppointment(false)}>
          <div style={s.modalBox}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ ...s.h2, fontSize: 18 }}>Book Appointment</h2>
              <button style={{ ...s.btn, ...s.btnGhost, padding: "5px 8px" }} onClick={() => setShowAddAppointment(false)}><X size={15} /></button>
            </div>
            <div style={s.formGrid}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Patient *</label>
                <select style={s.input} value={newAppointment.patientId} onChange={e => setNewAppointment(a => ({ ...a, patientId: e.target.value }))}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Date *</label>
                <input type="date" style={s.input} value={newAppointment.date} onChange={e => setNewAppointment(a => ({ ...a, date: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Time *</label>
                <input type="time" style={s.input} value={newAppointment.time} onChange={e => setNewAppointment(a => ({ ...a, time: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Type</label>
                <select style={s.input} value={newAppointment.type} onChange={e => setNewAppointment(a => ({ ...a, type: e.target.value }))}>
                  {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Duration (mins)</label>
                <select style={s.input} value={newAppointment.duration} onChange={e => setNewAppointment(a => ({ ...a, duration: Number(e.target.value) }))}>
                  {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Status</label>
                <select style={s.input} value={newAppointment.status} onChange={e => setNewAppointment(a => ({ ...a, status: e.target.value }))}>
                  {["confirmed","pending","cancelled"].map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button style={{ ...s.btn, ...s.btnPrimary, flex: 1, justifyContent: "center" }} onClick={addAppointment}>
                <Check size={14} /> Confirm Booking
              </button>
              <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setShowAddAppointment(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PATIENT MODAL */}
      {showAddPatient && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowAddPatient(false)}>
          <div style={s.modalBox}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ ...s.h2, fontSize: 18 }}>Add New Patient</h2>
              <button style={{ ...s.btn, ...s.btnGhost, padding: "5px 8px" }} onClick={() => setShowAddPatient(false)}><X size={15} /></button>
            </div>
            <div style={s.formGrid}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Full Name *</label>
                <input style={s.input} placeholder="e.g. Thandi Mokoena" value={newPatient.name} onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Phone Number *</label>
                <input style={s.input} placeholder="+27 82 000 0000" value={newPatient.phone} onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" placeholder="patient@email.com" value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Date of Birth</label>
                <input type="date" style={s.input} value={newPatient.dob} onChange={e => setNewPatient(p => ({ ...p, dob: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
                <input type="checkbox" id="wa-opt" checked={newPatient.whatsappOptIn} onChange={e => setNewPatient(p => ({ ...p, whatsappOptIn: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <label htmlFor="wa-opt" style={{ fontSize: 13, color: "#0f172a", cursor: "pointer" }}>
                  Patient consents to WhatsApp reminders
                </label>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Notes</label>
                <textarea style={{ ...s.input, resize: "vertical", minHeight: 72 }} placeholder="Allergies, preferences, medical notes..." value={newPatient.notes} onChange={e => setNewPatient(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button style={{ ...s.btn, ...s.btnPrimary, flex: 1, justifyContent: "center" }} onClick={addPatient}>
                <Plus size={14} /> Add Patient
              </button>
              <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setShowAddPatient(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* OPT-IN MANAGE MODAL */}
      {showOptInModal && (() => {
        const patient = patients.find(p => p.id === showOptInModal);
        if (!patient) return null;
        return (
          <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowOptInModal(null)}>
            <div style={{ ...s.modalBox, width: 420 }}>
              <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eff6ff", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={24} color="#2563eb" />
                </div>
                <h2 style={{ ...s.h2, fontSize: 18, marginBottom: 6 }}>WhatsApp Consent</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Managing consent for <strong>{patient.name}</strong></p>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px", lineHeight: 1.6 }}>
                  By opting in, <strong>{patient.name}</strong> agrees to receive appointment reminders and 6-monthly recall messages via WhatsApp from {PRACTICE_NAME}.
                </p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>They can opt out at any time by replying STOP to any message.</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {patient.whatsappOptIn ? (
                  <button style={{ ...s.btn, ...s.btnDanger, flex: 1, justifyContent: "center" }} onClick={() => handleOptIn(patient.id, false)}>
                    <X size={13} /> Opt Out Patient
                  </button>
                ) : (
                  <button style={{ ...s.btn, ...s.btnWhatsApp, flex: 1, justifyContent: "center" }} onClick={() => handleOptIn(patient.id, true)}>
                    <Check size={13} /> Opt In and Send Welcome
                  </button>
                )}
                <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setShowOptInModal(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/*
 * ─── BACKEND INTEGRATION GUIDE ─────────────────────────────────────────────
 *
 * 1. WHATSAPP API (Twilio):
 *    npm install twilio
 *
 *    // server/routes/whatsapp.js
 *    const twilio = require('twilio');
 *    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
 *    app.post('/api/send-whatsapp', async (req, res) => {
 *      const { to, message } = req.body;
 *      await client.messages.create({
 *        from: 'whatsapp:+14155238886',
 *        to: `whatsapp:${to}`,
 *        body: message
 *      });
 *      res.json({ success: true });
 *    });
 *
 * 2. DAILY CRON JOB (node-cron):
 *    const cron = require('node-cron');
 *    cron.schedule('0 8 * * *', () => {
 *      fetch('/api/run-reminders', { method: 'POST' });
 *    });
 *
 * 3. DATABASE (Prisma + PostgreSQL):
 *    npx prisma init
 *    // Define Patient and Appointment models in schema.prisma
 *    // Replace useState arrays with fetch() calls to your API routes
 *
 * 4. ENVIRONMENT VARIABLES (.env):
 *    TWILIO_SID=your_account_sid
 *    TWILIO_TOKEN=your_auth_token
 *    TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
 *    DATABASE_URL=postgresql://user:password@localhost:5432/dental
 *
 * 5. ALTERNATIVE WhatsApp APIs:
 *    - Infobip: https://www.infobip.com/whatsapp
 *    - Meta Cloud API: https://developers.facebook.com/docs/whatsapp
 *    - Vonage: https://www.vonage.com/communications-apis/messages/
 */
