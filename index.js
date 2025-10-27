// frontend JS calling Flask API endpoints
const api = {
  students: '/api/students',
  rooms: '/api/rooms',
  bookings: '/api/bookings',
  payments: '/api/payments'
};

function el(q){ return document.querySelector(q) }
function uid(pref='id'){ return pref + Date.now().toString(36) }

async function fetchJSON(url, opts){
  const res = await fetch(url, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

async function listStudents(){ return await fetchJSON(api.students) }
async function listRooms(){ return await fetchJSON(api.rooms) }
async function listBookings(){ return await fetchJSON(api.bookings) }
async function listPayments(){ return await fetchJSON(api.payments) }

async function createStudent(data){ return await fetchJSON(api.students, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}) }
async function createRoom(data){ return await fetchJSON(api.rooms, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}) }
async function createBooking(data){ return await fetchJSON(api.bookings, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}) }
async function createPayment(data){ return await fetchJSON(api.payments, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}) }

async function deleteStudent(id){ return await fetchJSON(`${api.students}/${id}`, {method:'DELETE'}) }
async function deleteRoom(id){ return await fetchJSON(`${api.rooms}/${id}`, {method:'DELETE'}) }
async function checkoutBooking(id){ return await fetchJSON(`${api.bookings}/${id}`, {method:'DELETE'}) }
async function deletePayment(id){ return await fetchJSON(`${api.payments}/${id}`, {method:'DELETE'}) }

async function renderAll(){
  const [students, rooms, bookings, payments] = await Promise.all([listStudents(), listRooms(), listBookings(), listPayments()]);
  renderStats(students, rooms, bookings);
  renderRecentBookings(bookings, students, rooms);
  renderStudentsList(students);
  renderRoomsList(rooms);
  renderBookingFormOptions(students, rooms);
  renderBookingsList(bookings, students, rooms);
  renderPaymentsTable(payments, bookings, students, rooms);
}

function renderStats(students, rooms, bookings){
  el('#stat-students').textContent = students.length;
  el('#stat-rooms').textContent = rooms.length;
  el('#stat-bookings').textContent = bookings.length;
}

function renderRecentBookings(bookings, students, rooms){
  const wrap = el('#recent-bookings'); wrap.innerHTML = '';
  bookings.slice(0,5).forEach(b=>{
    const s = students.find(st=>st.id===b.student_id) || {name:'Unknown'};
    const r = rooms.find(rr=>rr.id===b.room_id) || {number:'--', price:0};
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><div style="font-weight:600">${s.name}</div><div class="muted">Room ${r.number} • ${b.from} → ${b.to}</div></div>
      <div><button class="btn success" data-pay="${b.id}">Pay</button> <button class="btn danger" data-check="${b.id}">Checkout</button></div>`;
    wrap.appendChild(div);
  });
}

function renderStudentsList(students){
  const wrap = el('#students-list'); wrap.innerHTML='';
  students.forEach(s=>{
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><div style="font-weight:600">${s.name}</div><div class="muted">${s.email||''} ${s.phone? ' • '+s.phone : ''}</div></div>
      <div class="actions">
        <button class="btn" data-book="${s.id}">Book</button>
        <button class="btn danger" data-del-stu="${s.id}">Delete</button>
      </div>`;
    wrap.appendChild(div);
  });
}

function renderRoomsList(rooms){
  const wrap = el('#rooms-list'); wrap.innerHTML='';
  rooms.forEach(r=>{
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><div style="font-weight:600">${r.number} — ${r.type}</div><div class="muted">₹${r.price} • cap: ${r.capacity} • ${r.available? 'Available':'Occupied'}</div></div>
      <div class="actions">
        <button class="btn" data-edit-room="${r.id}">Edit</button>
        <button class="btn danger" data-del-room="${r.id}">Delete</button>
      </div>`;
    wrap.appendChild(div);
  });
}

function renderBookingFormOptions(students, rooms){
  const sSel = el('#bk-student'); sSel.innerHTML = '<option value="">Select</option>';
  students.forEach(s => sSel.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.name}</option>`));
  const rSel = el('#bk-room'); rSel.innerHTML = '<option value="">Select</option>';
  rooms.filter(r=>r.available).forEach(r => rSel.insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.number} — ${r.type} • ₹${r.price}</option>`));
}

function renderBookingsList(bookings, students, rooms){
  const wrap = el('#bookings-list'); wrap.innerHTML='';
  bookings.forEach(b=>{
    const s = students.find(st=>st.id===b.student_id) || {name:'Unknown'};
    const r = rooms.find(rr=>rr.id===b.room_id) || {number:'--',price:0};
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><div style="font-weight:600">${s.name} — Room ${r.number}</div><div class="muted">${b.from} → ${b.to}</div></div>
      <div>
        <button class="btn success" data-pay="${b.id}">Pay ₹${r.price}</button>
        <button class="btn danger" data-check="${b.id}">Checkout</button>
      </div>`;
    wrap.appendChild(div);
  });
  if(bookings.length===0) wrap.innerHTML = '<div class="muted">No active bookings</div>';
}

function formatDateISO(iso){
  if(!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString();
}

function renderPaymentsTable(payments, bookings, students, rooms){
  const tbody = el('#payments-table tbody'); tbody.innerHTML='';
  payments.forEach(p=>{
    const bk = bookings.find(b=>b.id===p.booking_id) || {};
    const s = students.find(st=>st.id===bk.student_id) || {name:'Unknown'};
    const r = rooms.find(rr=>rr.id===bk.room_id) || {number:'--'};
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>Room ${r.number}</td><td>₹${p.amount}</td><td>${formatDateISO(p.date)}</td><td><button class="btn" data-del-pay="${p.id}">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  if(payments.length===0) tbody.innerHTML = '<tr><td colspan="5" class="muted">No payments recorded</td></tr>';
}

// UI: navigation
document.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  showView(b.dataset.view);
}));

function showView(name){
  document.querySelectorAll('.view').forEach(v => v.style.display = v.id === 'view-' + name ? '' : 'none');
  renderAll().catch(err => console.error(err));
}

// Forms
document.getElementById('form-student').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try {
    const name = el('#stu-name').value.trim();
    if(!name) return alert('Enter name');
    await createStudent({name, email: el('#stu-email').value.trim(), phone: el('#stu-phone').value.trim()});
    el('#form-student').reset();
    await renderAll();
    showView('students');
  } catch(err){ alert(err.message || err) }
});

document.getElementById('form-room').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try {
    const number = el('#room-number').value.trim();
    if(!number) return alert('Enter room number');
    await createRoom({number, type: el('#room-type').value, price: Number(el('#room-price').value)||0, capacity: Number(el('#room-capacity').value)||1});
    el('#form-room').reset();
    await renderAll();
    showView('rooms');
  } catch(err){ alert(err.message || err) }
});

document.getElementById('form-booking').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try {
    const student_id = Number(el('#bk-student').value);
    const room_id = Number(el('#bk-room').value);
    if(!student_id || !room_id) return alert('Choose student and room');
    const from = el('#bk-from').value, to = el('#bk-to').value;
    await createBooking({student_id, room_id, from, to});
    el('#form-booking').reset();
    await renderAll();
    showView('bookings');
  } catch(err){ alert(err.message || err) }
});

// delegated actions
document.body.addEventListener('click', async (ev)=>{
  const t = ev.target;
  try {
    if(t.matches('[data-del-stu]')){
      const id = t.dataset.delStu;
      if(!confirm('Delete student?')) return;
      await deleteStudent(id);
      await renderAll();
    }
    if(t.matches('[data-del-room]')){
      const id = t.dataset.delRoom;
      if(!confirm('Delete room?')) return;
      await deleteRoom(id);
      await renderAll();
    }
    if(t.matches('[data-edit-room]')){
      const id = t.dataset.editRoom;
      // load room details and prefill -> naive: ask server for rooms and find
      const rooms = await listRooms();
      const r = rooms.find(x => x.id == id);
      if(!r) return;
      el('#room-number').value = r.number; el('#room-type').value = r.type; el('#room-price').value = r.price; el('#room-capacity').value = r.capacity;
      // delete old entry so saving becomes 'edit' in this simple flow
      await deleteRoom(id);
      await renderAll();
      window.scrollTo({top:0,behavior:'smooth'});
    }
    if(t.matches('[data-book]')){
      const sid = t.dataset.book;
      showView('bookings');
      setTimeout(()=>{ el('#bk-student').value = sid; }, 100);
    }
    if(t.matches('[data-pay]')){
      const bid = t.dataset.pay;
      const bookings = await listBookings(); const rooms = await listRooms();
      const bk = bookings.find(x=>x.id==bid);
      const room = rooms.find(r=>r.id==bk.room_id) || {};
      let amount = room.price || 0;
      const entered = prompt('Enter amount to record', amount);
      if(entered === null) return;
      amount = Number(entered);
      await createPayment({booking_id: bid, amount});
      await renderAll();
      alert('Payment recorded');
    }
    if(t.matches('[data-check]')){
      const bid = t.dataset.check;
      if(!confirm('Confirm checkout?')) return;
      await checkoutBooking(bid);
      await renderAll();
      alert('Checked out');
    }
    if(t.matches('[data-del-pay]')){
      const pid = t.dataset.delPay;
      if(!confirm('Delete payment?')) return;
      await deletePayment(pid);
      await renderAll();
    }
  } catch(err){
    alert(err.message || err);
    console.error(err);
  }
});

// initial
showView('dashboard');
