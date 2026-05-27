import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, Car, User, Calendar,
  ClipboardCheck, MapPin, Gauge, Fuel, Hash, DollarSign,
} from 'lucide-react';
import { api } from '../lib/api';

const today = () => new Date().toISOString().slice(0, 10);

const STEPS = [
  { label: 'Vehicle',  icon: Car },
  { label: 'Customer', icon: User },
  { label: 'Details',  icon: Calendar },
  { label: 'Confirm',  icon: ClipboardCheck },
];

const CATEGORIES  = ['all', 'sedan', 'suv', 'hatchback', 'van', 'other'];
const FUEL_LEVELS = ['full', '3/4', '1/2', '1/4', 'empty'];
const FUEL_LABELS = { full: 'Full', '3/4': '¾ Full', '1/2': 'Half', '1/4': '¼ Full', empty: 'Empty' };

/* ─── tiny helpers ──────────────────────────────────────────────── */
function Label({ children, required }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
      {children}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>
  );
}
function SectionTitle({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--violet-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} color="var(--violet)" />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
        {children}
      </span>
    </div>
  );
}
function ConfirmRow({ label, value, mono }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 16,
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text3)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right', fontFamily: mono ? 'var(--mono)' : undefined }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Right context panel ───────────────────────────────────────── */
function ContextPanel({ step, selectedVehicle, cust, details, days, totalEst }) {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: 'var(--surface2)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Selected vehicle — always shown */}
      <div style={{ padding: '20px 20px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text3)', marginBottom: 10 }}>
          Selected Vehicle
        </p>
        {selectedVehicle ? (
          <div style={{
            background: 'var(--surface)', borderRadius: 10, padding: 14,
            border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'var(--violet-bg)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: 10,
            }}>
              <Car size={18} color="var(--violet)" />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, letterSpacing: '.05em', marginBottom: 4 }}>
              {selectedVehicle.plate_number}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {selectedVehicle.color} · {selectedVehicle.category}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)', borderRadius: 10, padding: 14,
            border: '2px dashed var(--border)', textAlign: 'center',
            color: 'var(--text3)', fontSize: 13,
          }}>
            No vehicle selected
          </div>
        )}
      </div>

      {/* Customer — shown from step 2+ */}
      {step >= 2 && cust?.full_name && (
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text3)', marginBottom: 10 }}>
            Customer
          </p>
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <User size={16} color="var(--green)" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{cust.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{cust.phone}</div>
            {cust.email && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{cust.email}</div>}
            {cust.id_number && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{cust.id_number}</div>}
          </div>
        </div>
      )}

      {/* Rental summary — shown from step 3 */}
      {step >= 3 && (details.start_date || details.expected_return_date) && (
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text3)', marginBottom: 10 }}>
            Rental Summary
          </p>
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {days && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Duration</span>
                <span style={{ fontWeight: 700, color: 'var(--violet)' }}>{days} day{days !== 1 ? 's' : ''}</span>
              </div>
            )}
            {details.start_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Start</span>
                <span style={{ fontWeight: 600 }}>{details.start_date}</span>
              </div>
            )}
            {details.expected_return_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Return</span>
                <span style={{ fontWeight: 600 }}>{details.expected_return_date}</span>
              </div>
            )}
            {totalEst && (
              <div style={{
                marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', fontSize: 13,
              }}>
                <span style={{ color: 'var(--text3)' }}>Est. Total</span>
                <span style={{ fontWeight: 800, color: 'var(--green)', fontSize: 15 }}>${totalEst}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step hint */}
      <div style={{ marginTop: 'auto', padding: '20px' }}>
        <div style={{
          background: 'var(--violet-bg)', border: '1px solid rgba(79,70,229,.15)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Step {step + 1} of 4
          </p>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            {step === 0 && 'Pick an available vehicle from the list.'}
            {step === 1 && 'Add a new customer or select an existing one.'}
            {step === 2 && 'Set the rental dates, location, and pricing.'}
            {step === 3 && 'Review everything before creating the rental.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function NewRentalWizard() {
  const navigate = useNavigate();

  const [step,       setStep]      = useState(0);
  const [vehicles,   setVehicles]  = useState([]);
  const [customers,  setCustomers] = useState([]);
  const [busy,       setBusy]      = useState(false);
  const [error,      setError]     = useState(null);

  const [selectedVehicle,  setSelectedVehicle]  = useState(null);
  const [categoryFilter,   setCategoryFilter]   = useState('all');

  const [customerMode,     setCustomerMode]     = useState('new');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch,   setCustomerSearch]   = useState('');
  const [customerForm,     setCustomerForm]     = useState({
    full_name: '', phone: '', email: '', id_number: '',
    license_expiry: '', address: '',
  });

  const [details, setDetails] = useState({
    start_date: today(), expected_return_date: '',
    pickup_location: '', dropoff_location: '',
    fuel_level_pickup: '', odometer_pickup: '',
    daily_rate: '', notes: '',
  });

  useEffect(() => {
    api.listVehicles('available').then(setVehicles).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 1) {
      api.listCustomers(customerSearch || null).then(setCustomers).catch(() => {});
    }
  }, [step, customerSearch]);

  function nextStep() { setStep(s => Math.min(s + 1, 3)); setError(null); }
  function prevStep() { setStep(s => Math.max(s - 1, 0)); }

  function canNext() {
    if (step === 0) return !!selectedVehicle;
    if (step === 1) return customerMode === 'existing'
      ? !!selectedCustomer
      : !!(customerForm.full_name && customerForm.phone && customerForm.id_number);
    if (step === 2) return !!(details.start_date && details.expected_return_date);
    return true;
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      let customer = selectedCustomer;
      if (customerMode === 'new') {
        customer = await api.createCustomer({
          full_name:      customerForm.full_name,
          phone:          customerForm.phone,
          email:          customerForm.email   || null,
          id_number:      customerForm.id_number,
          address:        customerForm.address || null,
          license_expiry: customerForm.license_expiry || null,
        });
      }
      const rental = await api.createRental({
        vehicle_id:           selectedVehicle.id,
        customer_id:          customer.id,
        start_date:           details.start_date,
        expected_return_date: details.expected_return_date,
        notes:                details.notes            || null,
        pickup_location:      details.pickup_location  || null,
        dropoff_location:     details.dropoff_location || null,
        fuel_level_pickup:    details.fuel_level_pickup || null,
        odometer_pickup:      details.odometer_pickup  ? parseInt(details.odometer_pickup, 10) : null,
        daily_rate:           details.daily_rate       ? parseFloat(details.daily_rate)        : null,
      });
      navigate(`/rentals/${rental.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredVehicles = categoryFilter === 'all'
    ? vehicles
    : vehicles.filter(v => v.category === categoryFilter);

  const cust = customerMode === 'existing' ? selectedCustomer : customerForm;
  const days = details.start_date && details.expected_return_date
    ? Math.max(1, Math.round((new Date(details.expected_return_date) - new Date(details.start_date)) / 86400000))
    : null;
  const totalEst = details.daily_rate && days
    ? (parseFloat(details.daily_rate) * days).toFixed(2)
    : null;

  /* ── Outer shell fills full viewport height minus topbar + page padding ── */
  return (
    <div
      className="fade-up"
      style={{
        /* stretch from top of .page to bottom of viewport */
        height: 'calc(100vh - 56px - 64px)',   /* topbar 56 + page padding 32×2 */
        display: 'flex',
        flexDirection: 'column',
        margin: '-32px -36px',                 /* cancel .page padding so we touch the edges */
        overflow: 'hidden',
      }}
    >
      {/* ── TOP HEADER BAR ─────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '20px 32px 0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <div style={{ marginBottom: 16 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>New Rental</h1>
          <p className="page-sub">Complete all 4 steps to create a rental and start the pre-inspection</p>
        </div>

        {/* Step indicator */}
        <div className="wizard-steps" style={{ marginBottom: 0 }}>
          {STEPS.map(({ label, icon: Icon }, i) => (
            <Fragment key={i}>
              <div className={`wizard-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <div className={`wizard-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  {i < step ? <Check size={13} /> : <Icon size={12} />}
                </div>
                {label}
              </div>
              {i < STEPS.length - 1 && <div className={`wizard-line ${i < step ? 'done' : ''}`} />}
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── ERROR BANNER ───────────────────────────────────────────── */}
      {error && (
        <div style={{
          flexShrink: 0,
          background: 'var(--red-bg)', borderBottom: '1px solid rgba(220,38,38,.2)',
          padding: '10px 32px', color: 'var(--red)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── BODY: content + context panel ──────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Left — step content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── Step 0: Vehicle ── */}
          {step === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 28px', gap: 14 }}>
              {/* Category chips */}
              <div style={{ flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCategoryFilter(cat)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {cat === 'all' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>

              {/* Vehicle grid — scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {filteredVehicles.length === 0 ? (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'column', gap: 10,
                    color: 'var(--text3)', fontSize: 14,
                  }}>
                    {vehicles.length === 0
                      ? <><span>No available vehicles.</span><button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehicles')}>Add one →</button></>
                      : `No ${categoryFilter} vehicles available.`}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 14, alignContent: 'start',
                  }}>
                    {filteredVehicles.map(v => {
                      const isSelected = selectedVehicle?.id === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehicle(v)}
                          style={{
                            cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
                            border: isSelected ? '2px solid var(--violet)' : '2px solid var(--border)',
                            background: isSelected ? 'var(--violet-bg)' : 'var(--surface)',
                            transition: 'all .15s',
                            boxShadow: isSelected ? '0 0 0 4px var(--violet-glow)' : 'none',
                            display: 'flex', flexDirection: 'column',
                          }}
                        >
                          {/* Top accent bar */}
                          <div style={{ height: 4, background: v.status === 'available' ? 'var(--green)' : 'var(--amber)' }} />

                          <div style={{ padding: '16px 18px', flex: 1 }}>
                            {/* Icon + status row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                              <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: isSelected ? 'rgba(79,70,229,.15)' : 'var(--surface2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Car size={22} color={isSelected ? 'var(--violet)' : 'var(--text3)'} />
                              </div>
                              {isSelected && (
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%',
                                  background: 'var(--violet)', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Check size={12} color="#fff" />
                                </div>
                              )}
                            </div>

                            {/* Plate */}
                            <div style={{
                              fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800,
                              letterSpacing: '.06em', marginBottom: 6,
                              color: isSelected ? 'var(--violet)' : 'var(--text)',
                            }}>
                              {v.plate_number}
                            </div>

                            {/* Name */}
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
                              {v.year} {v.make} {v.model}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                              {v.color} · {v.category}
                            </div>
                          </div>

                          {/* Available badge */}
                          <div style={{
                            padding: '8px 18px',
                            borderTop: `1px solid ${isSelected ? 'rgba(79,70,229,.2)' : 'var(--border)'}`,
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '.06em', color: 'var(--green)',
                            background: isSelected ? 'rgba(79,70,229,.06)' : 'var(--surface2)',
                          }}>
                            ● Available
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 1: Customer ── */}
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 28px', gap: 14 }}>
              {/* Tabs */}
              <div className="tabs" style={{ flexShrink: 0 }}>
                <button className={`tab ${customerMode === 'new' ? 'active' : ''}`}
                  onClick={() => { setCustomerMode('new'); setSelectedCustomer(null); }}>
                  New Customer
                </button>
                <button className={`tab ${customerMode === 'existing' ? 'active' : ''}`}
                  onClick={() => setCustomerMode('existing')}>
                  Existing Customer
                </button>
              </div>

              {/* New customer form */}
              {customerMode === 'new' && (
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
                    <div className="grid-2">
                      <div>
                        <Label required>Full Name</Label>
                        <input className="field" style={{ width: '100%' }}
                          value={customerForm.full_name}
                          onChange={e => setCustomerForm(f => ({ ...f, full_name: e.target.value }))}
                          placeholder="John Smith" />
                      </div>
                      <div>
                        <Label required>Phone</Label>
                        <input className="field" style={{ width: '100%' }} type="tel"
                          value={customerForm.phone}
                          onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="+1 555 0100" />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div>
                        <Label>Email</Label>
                        <input className="field" style={{ width: '100%' }} type="email"
                          value={customerForm.email}
                          onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="Optional" />
                      </div>
                      <div>
                        <Label required>License / ID Number</Label>
                        <input className="field" style={{ width: '100%', fontFamily: 'var(--mono)' }}
                          value={customerForm.id_number}
                          onChange={e => setCustomerForm(f => ({ ...f, id_number: e.target.value }))}
                          placeholder="DL-123456" />
                      </div>
                    </div>
                    <div>
                      <Label>License Expiry Date</Label>
                      <input className="field" type="date" style={{ maxWidth: 220 }}
                        value={customerForm.license_expiry}
                        onChange={e => setCustomerForm(f => ({ ...f, license_expiry: e.target.value }))} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Label>Address</Label>
                      <textarea className="field"
                        style={{ width: '100%', minHeight: 100, resize: 'vertical' }}
                        value={customerForm.address}
                        onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="Street, City, Postcode" />
                    </div>
                  </div>
                </div>
              )}

              {/* Existing customer list */}
              {customerMode === 'existing' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                  <input className="field" style={{ flexShrink: 0 }}
                    placeholder="Search by name, phone, or ID…"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)} />
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {customers.map(c => (
                      <div key={c.id} onClick={() => setSelectedCustomer(c)} style={{
                        flexShrink: 0, padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                        border: selectedCustomer?.id === c.id ? '2px solid var(--violet)' : '1px solid var(--border)',
                        background: selectedCustomer?.id === c.id ? 'var(--violet-bg)' : 'var(--surface)',
                        transition: 'all .15s',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                          {c.phone}{c.email ? ` · ${c.email}` : ''} · <span style={{ fontFamily: 'var(--mono)' }}>{c.id_number}</span>
                        </div>
                      </div>
                    ))}
                    {customers.length === 0 && (
                      <p style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No customers found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Rental Details ── */}
          {step === 2 && (
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Rental Period */}
                <div>
                  <SectionTitle icon={Calendar}>Rental Period</SectionTitle>
                  <div className="grid-2">
                    <div>
                      <Label required>Start Date</Label>
                      <input className="field" style={{ width: '100%' }} type="date"
                        value={details.start_date}
                        onChange={e => setDetails(d => ({ ...d, start_date: e.target.value }))} />
                    </div>
                    <div>
                      <Label required>Expected Return</Label>
                      <input className="field" style={{ width: '100%' }} type="date"
                        value={details.expected_return_date} min={details.start_date}
                        onChange={e => setDetails(d => ({ ...d, expected_return_date: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <SectionTitle icon={MapPin}>Locations</SectionTitle>
                  <div className="grid-2">
                    <div>
                      <Label>Pickup Location</Label>
                      <input className="field" style={{ width: '100%' }}
                        value={details.pickup_location}
                        onChange={e => setDetails(d => ({ ...d, pickup_location: e.target.value }))}
                        placeholder="e.g. Airport Terminal 1" />
                    </div>
                    <div>
                      <Label>Dropoff Location</Label>
                      <input className="field" style={{ width: '100%' }}
                        value={details.dropoff_location}
                        onChange={e => setDetails(d => ({ ...d, dropoff_location: e.target.value }))}
                        placeholder="e.g. City Centre Branch" />
                    </div>
                  </div>
                </div>

                {/* Vehicle State */}
                <div>
                  <SectionTitle icon={Gauge}>Vehicle State &amp; Pricing</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div>
                      <Label>Fuel Level</Label>
                      <select className="field" style={{ width: '100%' }}
                        value={details.fuel_level_pickup}
                        onChange={e => setDetails(d => ({ ...d, fuel_level_pickup: e.target.value }))}>
                        <option value="">Select…</option>
                        {FUEL_LEVELS.map(f => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Odometer (km)</Label>
                      <input className="field" style={{ width: '100%', fontFamily: 'var(--mono)' }}
                        type="number" min={0} step={1}
                        value={details.odometer_pickup}
                        onChange={e => setDetails(d => ({ ...d, odometer_pickup: e.target.value }))}
                        placeholder="e.g. 42500" />
                    </div>
                    <div>
                      <Label>Daily Rate ($)</Label>
                      <input className="field" style={{ width: '100%', fontFamily: 'var(--mono)' }}
                        type="number" min={0} step={0.01}
                        value={details.daily_rate}
                        onChange={e => setDetails(d => ({ ...d, daily_rate: e.target.value }))}
                        placeholder="e.g. 89.00" />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <textarea className="field"
                    style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
                    value={details.notes}
                    onChange={e => setDetails(d => ({ ...d, notes: e.target.value }))}
                    placeholder="Special conditions, damage waivers, additional agreements…" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignContent: 'start' }}>

                {/* Vehicle card */}
                <div className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Car size={14} color="var(--violet)" />
                      <span className="card-title">Vehicle</span>
                    </div>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                    <ConfirmRow label="Vehicle"  value={`${selectedVehicle?.year} ${selectedVehicle?.make} ${selectedVehicle?.model}`} />
                    <ConfirmRow label="Plate"    value={selectedVehicle?.plate_number} mono />
                    <ConfirmRow label="Category" value={selectedVehicle?.category} />
                    <ConfirmRow label="Colour"   value={selectedVehicle?.color} />
                  </div>
                </div>

                {/* Customer card */}
                <div className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={14} color="var(--violet)" />
                      <span className="card-title">Customer</span>
                    </div>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                    <ConfirmRow label="Name"           value={cust?.full_name} />
                    <ConfirmRow label="Phone"          value={cust?.phone} />
                    <ConfirmRow label="Email"          value={cust?.email} />
                    <ConfirmRow label="License / ID"   value={cust?.id_number} mono />
                    <ConfirmRow label="License Expiry" value={cust?.license_expiry} />
                    <ConfirmRow label="Address"        value={cust?.address} />
                  </div>
                </div>

                {/* Rental details — spans full width */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} color="var(--violet)" />
                      <span className="card-title">Rental Details</span>
                    </div>
                    {totalEst && (
                      <div style={{
                        background: 'var(--violet-bg)', border: '1px solid rgba(79,70,229,.2)',
                        borderRadius: 99, padding: '3px 14px',
                        fontSize: 13, fontWeight: 700, color: 'var(--violet)',
                      }}>
                        Est. ${totalEst} ({days}d)
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                      <div>
                        <ConfirmRow label="Start Date"       value={details.start_date} />
                        <ConfirmRow label="Expected Return"  value={details.expected_return_date} />
                        <ConfirmRow label="Pickup Location"  value={details.pickup_location} />
                        <ConfirmRow label="Dropoff Location" value={details.dropoff_location} />
                      </div>
                      <div>
                        <ConfirmRow label="Fuel at Pickup"   value={details.fuel_level_pickup ? FUEL_LABELS[details.fuel_level_pickup] : null} />
                        <ConfirmRow label="Odometer"         value={details.odometer_pickup ? `${parseInt(details.odometer_pickup).toLocaleString()} km` : null} />
                        <ConfirmRow label="Daily Rate"       value={details.daily_rate ? `$${parseFloat(details.daily_rate).toFixed(2)} / day` : null} />
                        <ConfirmRow label="Notes"            value={details.notes} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info note */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--violet-bg)', borderRadius: 10,
                  padding: '12px 16px', fontSize: 13, color: 'var(--text2)',
                  border: '1px solid rgba(79,70,229,.15)',
                }}>
                  ✦ After confirming, you'll be taken to the rental page to start the <strong>pre-inspection</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — context panel */}
        <ContextPanel
          step={step}
          selectedVehicle={selectedVehicle}
          cust={cust}
          details={details}
          days={days}
          totalEst={totalEst}
        />
      </div>

      {/* ── BOTTOM NAV BAR ─────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        padding: '14px 28px',
        background: 'var(--surface)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button className="btn btn-ghost" onClick={step === 0 ? () => navigate('/rentals') : prevStep}>
          <ChevronLeft size={15} /> {step === 0 ? 'Cancel' : 'Back'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {selectedVehicle && step === 0 && (
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} selected
            </span>
          )}
          {step < 3
            ? <button className="btn btn-primary" disabled={!canNext()} onClick={nextStep} style={{ padding: '9px 22px' }}>
                Next <ChevronRight size={15} />
              </button>
            : <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ padding: '9px 22px' }}>
                {busy ? 'Creating…' : <><Check size={14} /> Create Rental</>}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
