const BASE = '/api/v1';

async function handle(r) {
  if (r.ok) { if (r.status === 204) return null; return r.json(); }
  let msg = r.statusText;
  try { const t = await r.text(); if (t) msg = t; } catch {}
  throw new Error(msg);
}

export const api = {
  // Core primitives
  get:      (path)             => fetch(`${BASE}${path}`).then(handle),
  post:     (path, body)       => fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handle),
  patch:    (path, body = {})  => fetch(`${BASE}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handle),
  delete:   (path)             => fetch(`${BASE}${path}`, { method: 'DELETE' }).then(handle),
  postForm: (path, formData)   => fetch(`${BASE}${path}`, { method: 'POST', body: formData }).then(handle),

  // Vehicles
  listVehicles:  (status)       => api.get(`/vehicles${status ? `?status=${status}` : ''}`),
  createVehicle: (data)         => api.post('/vehicles', data),
  updateVehicle: (id, data)     => api.patch(`/vehicles/${id}`, data),
  deleteVehicle: (id)           => api.delete(`/vehicles/${id}`),

  // Customers
  listCustomers:  (search)      => api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (data)        => api.post('/customers', data),

  // Rentals
  listRentals:        (params = {}) => api.get(`/rentals?${new URLSearchParams(params)}`),
  createRental:       (data)        => api.post('/rentals', data),
  getRental:          (id)          => api.get(`/rentals/${id}`),
  updateRental:       (id, data)    => api.patch(`/rentals/${id}`, data),
  deleteRental:       (id)          => api.delete(`/rentals/${id}`),
  updateRentalStatus: (id, data)    => api.patch(`/rentals/${id}/status`, data),

  // Positions
  listPositions:  ()            => api.get('/positions'),
  createPosition: (data)        => api.post('/positions', data),
  updatePosition: (id, data)    => api.patch(`/positions/${id}`, data),
  deletePosition: (id)          => api.delete(`/positions/${id}`),

  // Inspections
  createInspection:       (rentalId, type)  => api.post(`/rentals/${rentalId}/inspections/${type}`, {}),
  getInspectionByRental:  (rentalId, type)  => api.get(`/rentals/${rentalId}/inspections/${type}`),
  completeInspection:     (inspectionId)    => api.patch(`/inspections/${inspectionId}/complete`, {}),
  getInspectionPhotos:    (inspectionId)    => api.get(`/inspections/${inspectionId}/photos`),
  addInspectionPhoto:  (inspectionId, positionId, file)    => {
    const fd = new FormData();
    fd.append('position_id', positionId);
    fd.append('file', file);
    return api.postForm(`/inspections/${inspectionId}/photos`, fd);
  },

  // Comparison
  runComparison: (rentalId)     => api.post(`/rentals/${rentalId}/compare`, {}),
  getComparison: (rentalId)     => api.get(`/rentals/${rentalId}/comparison`),

  // Dashboard
  fleetStats: ()                => api.get('/dashboard/fleet-stats'),

  // Helpers
  imageUrl: (path)              => path ? `${BASE}/images/${path.split('/').pop()}` : null,
  reportUrl: (rentalId)         => `${BASE}/rentals/${rentalId}/report/pdf`,
};
