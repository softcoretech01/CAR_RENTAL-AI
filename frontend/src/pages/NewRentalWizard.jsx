import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Car, User, Calendar, ClipboardCheck } from 'lucide-react';
import { api } from '../lib/api';
import VehicleCard from '../components/VehicleCard';

const today = () => new Date().toISOString().slice(0, 10);

const STEPS = [
  { label: 'Vehicle',   icon: Car },
  { label: 'Customer',  icon: User },
  { label: 'Dates',     icon: Calendar },
  { label: 'Confirm',   icon: ClipboardCheck },
];

export default function NewRentalWizard() {
  const navigate = useNavigate();

  const [step,       setStep]       = useState(0);
  const [vehicles,   setVehicles]   = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState(null);

  // Form state
  const [selectedVehicle,  setSelectedVehicle]  = useState(null);
  const [customerMode,     setCustomerMode]      = useState('new'); // 'new' | 'existing'
  const [selectedCustomer, setSelectedCustomer]  = useState(null);
  const [customerSearch,   setCustomerSearch]    = useState('');
  const [customerForm,     setCustomerForm]      = useState({ full_name: '', phone: '', email: '', id_number: '' });
  const [rentalDates,      setRentalDates]       = useState({ start_date: today(), expected_return_date: '', notes: '' });

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
    if (step === 1) return customerMode === 'existing' ? !!selectedCustomer : (customerForm.full_name && customerForm.phone && customerForm.id_number);
    if (step === 2) return rentalDates.start_date && rentalDates.expected_return_date;
    return true;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let customer = selectedCustomer;
      if (customerMode === 'new') {
        customer = await api.createCustomer(customerForm);
      }
      const rental = await api.createRental({
        vehicle_id:  selectedVehicle.id,
        customer_id: customer.id,
        start_date:  rentalDates.start_date,
        expected_return_date: rentalDates.expected_return_date,
        notes: rentalDates.notes || null,
      });
      navigate(`/rentals/${rental.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">New Rental</h1>
        <p className="page-sub">Complete all 4 steps to create a rental and start the pre-inspection</p>
      </div>

      {/* Step indicator */}
      <div className="wizard-steps" style={{ marginBottom: 36 }}>
        {STEPS.map(({ label, icon: Icon }, i) => (
          <Fragment key={i}>
            <div className={`wizard-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className={`wizard-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? <Check size={13} /> : <Icon size={12} />}
              </div>
              <span style={{ display: window.innerWidth < 480 ? 'none' : 'block' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`wizard-line ${i < step ? 'done' : ''}`} />}
          </Fragment>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Step 0 — Pick vehicle */}
      {step === 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pick a Vehicle</h2>
          {vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 14 }}>
              No available vehicles. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehicles')}>Add a vehicle →</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {vehicles.map(v => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  style={{
                    cursor: 'pointer',
                    outline: selectedVehicle?.id === v.id ? '2px solid var(--violet)' : '2px solid transparent',
                    borderRadius: 'var(--radius2)',
                    transition: 'outline .15s',
                  }}
                >
                  <VehicleCard vehicle={v} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1 — Customer */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Customer Details</h2>

          {/* Toggle */}
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab ${customerMode === 'new' ? 'active' : ''}`} onClick={() => { setCustomerMode('new'); setSelectedCustomer(null); }}>New Customer</button>
            <button className={`tab ${customerMode === 'existing' ? 'active' : ''}`} onClick={() => setCustomerMode('existing')}>Existing Customer</button>
          </div>

          {customerMode === 'new' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Full Name *</label>
                  <input className="field" style={{ width: '100%' }} value={customerForm.full_name} onChange={e => setCustomerForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Smith" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Phone *</label>
                  <input className="field" style={{ width: '100%' }} type="tel" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0100" />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Email</label>
                  <input className="field" style={{ width: '100%' }} type="email" value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>License / ID Number *</label>
                  <input className="field" style={{ width: '100%', fontFamily: 'var(--mono)' }} value={customerForm.id_number} onChange={e => setCustomerForm(f => ({ ...f, id_number: e.target.value }))} placeholder="DL-123456" />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <input
                className="field" style={{ width: '100%', marginBottom: 14 }}
                placeholder="Search by name, phone, or ID…"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {customers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    style={{
                      padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                      border: selectedCustomer?.id === c.id ? '2px solid var(--violet)' : '1px solid var(--border)',
                      background: selectedCustomer?.id === c.id ? 'var(--violet-bg)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {c.phone} · {c.id_number}
                    </div>
                  </div>
                ))}
                {customers.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>No customers found.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Dates */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Rental Dates</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Start Date *</label>
              <input className="field" style={{ width: '100%' }} type="date" value={rentalDates.start_date} onChange={e => setRentalDates(d => ({ ...d, start_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Expected Return Date *</label>
              <input className="field" style={{ width: '100%' }} type="date" value={rentalDates.expected_return_date} onChange={e => setRentalDates(d => ({ ...d, expected_return_date: e.target.value }))} min={rentalDates.start_date} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea className="field" style={{ width: '100%', minHeight: 80, resize: 'vertical' }} value={rentalDates.notes} onChange={e => setRentalDates(d => ({ ...d, notes: e.target.value }))} placeholder="Any special conditions, notes…" />
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Confirm Rental</h2>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row label="Vehicle"     value={`${selectedVehicle?.year} ${selectedVehicle?.make} ${selectedVehicle?.model} — ${selectedVehicle?.plate_number}`} />
              <Row label="Customer"    value={customerMode === 'existing' ? selectedCustomer?.full_name : customerForm.full_name} />
              <Row label="Phone"       value={customerMode === 'existing' ? selectedCustomer?.phone : customerForm.phone} />
              <Row label="ID/License"  value={customerMode === 'existing' ? selectedCustomer?.id_number : customerForm.id_number} />
              <Row label="Start Date"  value={rentalDates.start_date} />
              <Row label="Expected Return" value={rentalDates.expected_return_date} />
              {rentalDates.notes && <Row label="Notes" value={rentalDates.notes} />}
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
            After confirming, you'll be taken to the rental detail page to start the <strong>pre-inspection</strong>.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <button className="btn btn-ghost" onClick={step === 0 ? () => navigate('/rentals') : prevStep}>
          <ChevronLeft size={15} /> {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step < 3
          ? <button className="btn btn-primary" disabled={!canNext()} onClick={nextStep}>
              Next <ChevronRight size={15} />
            </button>
          : <button className="btn btn-primary" disabled={busy} onClick={submit}>
              {busy ? 'Creating…' : 'Create Rental & Start Pre-Inspection'}
            </button>
        }
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 16 }}>
      <span style={{ color: 'var(--text3)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}
