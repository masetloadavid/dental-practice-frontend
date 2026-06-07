const API_BASE_URL = "https://dental-practice-backend-production.up.railway.app";

export async function getPatients() {
  const response = await fetch(`${API_BASE_URL}/api/patients`);
  return response.json();
}

export async function addPatient(patient) {
  const response = await fetch(`${API_BASE_URL}/api/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patient),
  });

  return response.json();
}

export async function getAppointments() {
  const response = await fetch(`${API_BASE_URL}/api/appointments`);
  return response.json();
}

export async function addAppointment(appointment) {
  const response = await fetch(`${API_BASE_URL}/api/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(appointment),
  });

  return response.json();
}

export async function getAnalytics() {
  const response = await fetch(`${API_BASE_URL}/api/analytics`);
  return response.json();
}

export async function runReminders() {
  const response = await fetch(`${API_BASE_URL}/api/reminders/run`, {
    method: "POST",
  });

  return response.json();
}
