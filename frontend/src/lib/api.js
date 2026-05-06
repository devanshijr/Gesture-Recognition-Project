import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, timeout: 12000 });

export const fetchDevices = () => client.get("/devices").then((r) => r.data);

export const updateDevice = (id, payload) =>
  client.patch(`/devices/${id}`, payload).then((r) => r.data);

export const resetDevices = () => client.post("/devices/reset").then((r) => r.data);

export const logGestureEvent = (payload) =>
  client.post("/gesture-events", payload).then((r) => r.data);

export const fetchGestureEvents = (limit = 50) =>
  client.get(`/gesture-events?limit=${limit}`).then((r) => r.data);

export const clearGestureEvents = () => client.delete("/gesture-events").then((r) => r.data);

export const fetchStats = () => client.get("/stats").then((r) => r.data);
