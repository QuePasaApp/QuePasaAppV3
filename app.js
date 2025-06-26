// --- App constants ---
const APP_NAME = "QuePasaAppV3";

// --- Room Code Logic ---
function randomRoomCode() {
  // 6 digits + 1 uppercase letter
  const digits = Array.from({length: 6}, () => Math.floor(Math.random() * 10)).join('');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return digits + letter;
}

// Get or set 7-character room code in URL
let params = new URLSearchParams(window.location.search);
let room = params.get('room');
if (!room || !/^\d{6}[A-Z]$/.test(room)) {
  room = randomRoomCode();
  params.set('room', room);
  window.location.search = params.toString();
}

// --- Color pool (expanded and vibrant for nice user variety!) ---
const COLOR_MAP = {
  Red: '#e74c3c',
  Blue: '#3498db',
  Yellow: '#f1c40f',
  Green: '#27ae60',
  Purple: '#9b59b6',
  Orange: '#e67e22',
  Gold: '#ffd700',
  Silver: '#bdc3c7',
  Pink: '#fd79a8',
  Teal: '#00b894',
  Indigo: '#6c5ce7',
  Brown: '#8d5524',
  Navy: '#2d3436',
  Lime: '#b2ff59',
  Cyan: '#00bcd4',
  Magenta: '#d500f9'
};
const COLORS = Object.keys(COLOR_MAP);
const TITLES = ['Mr', 'Ms', 'Mx', 'Dr', 'Prof'];

// --- Generate or retrieve username + random color on each room join ---
function getUsername() {
  let userObj = localStorage.getItem(`anon_user_${room}`);
  if (!userObj) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const title = TITLES[Math.floor(Math.random() * TITLES.length)];
    const randomId = Math.floor(Math.random() * 10000);
    userObj = JSON.stringify({ username: `${title} ${color}${randomId}`, color });
    localStorage.setItem(`anon_user_${room}`, userObj);
  }
  return JSON.parse(userObj);
}

// --- Room Management (local only) ---
function getRoomOwner(room) {
  let owner = localStorage.getItem(`room_owner_${room}`);
  if (!owner) {
    owner = username.username; // First user to create the room is owner
    localStorage.setItem(`room_owner_${room}`, owner);
  }
  return owner;
}
function getUsersInRoom(room) {
  const data = localStorage.getItem(`room_users_${room}`);
  return data ? JSON.parse(data) : [];
}
function addUserToRoom(room, username) {
  let users = getUsersInRoom(room);
  if (!users.includes(username)) {
    users.push(username);
    localStorage.setItem(`room_users_${room}`, JSON.stringify(users));
  }
}
function removeUserFromRoom(room, username) {
  let users = getUsersInRoom(room);
  users = users.filter(u => u !== username);
  localStorage.setItem(`room_users_${room}`, JSON.stringify(users));
}
function getBlockedUsers(room) {
  const data = localStorage.getItem(`room_blocked_${room}`);
  return data ? JSON.parse(data) : [];
}
function blockUser(room, username) {
  let blocked = getBlockedUsers(room);
  if (!blocked.includes(username)) {
    blocked.push(username);
    localStorage.setItem(`room_blocked_${room}`, JSON.stringify(blocked));
  }
  removeUserFromRoom(room, username);
}

// --- App state ---
const username = getUsername();
const owner = getRoomOwner(room);

// --- Room access control ---
const blocked = getBlockedUsers(room);
if (blocked.includes(username.username)) {
  alert('You have been removed from this room.');
  removeUserFromRoom(room, username.username);
  document.body.innerHTML = `<h2 style="text-align:center;">You have been removed from this room.</h2>`;
  throw new Error('Blocked');
}

addUserToRoom(room, username.username);

// --- UI setup ---
document.title = APP_NAME;
document.getElementById('room-info').textContent = `Room Code: ${room} (Owner: ${owner})`;
document.getElementById('user-info').textContent = `You are: ${username.username}`;
document.getElementById('code-btn-code').textContent = room;

// --- Messages State ---
let messages = JSON.parse(localStorage.getItem(`room_msgs_${room}`) || '[]');

// --- Render user list for owner ---
function renderUserList() {
  const listDiv = document.getElementById('user-list');
  const users = getUsersInRoom(room);
  if (username.username === owner) {
    let html = '<b>Users:</b> ';
    html += users.map(u => {
      if (u === owner) return `${u} (owner)`;
      return `${u} <button class="kick-btn" data-user="${u}">Kick</button>`;
    }).join(', ');
    listDiv.innerHTML = html;
    document.querySelectorAll('.kick-btn').forEach(btn => {
      btn.onclick = function() {
        const userToKick = this.getAttribute('data-user');
        if (confirm(`Kick ${userToKick}?`)) {
          blockUser(room, userToKick);
          renderUserList();
        }
      };
    });
  } else {
    listDiv.innerHTML = '';
  }
}
renderUserList();

// --- Render messages ---
function renderMessages(messages) {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message';
    // Find color for user
    let color = COLOR_MAP[(msg.color && COLORS.includes(msg.color)) ? msg.color : 'Blue'];
    if (!color && msg.user) {
      // fallback: try to extract color from username
      for (const c of COLORS) if (msg.user && msg.user.includes(c)) color = COLOR_MAP[c];
    }
    div.style.background = color || '#888';
    if (msg.type === 'text') {
      div.textContent = `${msg.user}: ${msg.text}`;
    } else if (msg.type === 'location') {
      div.innerHTML = `<span class="location">📍 ${msg.user} pinned a location:</span> ${msg.lat}, ${msg.lng}`;
    }
    messagesDiv.appendChild(div);
  });
}
renderMessages(messages);

// --- Send text message ---
document.getElementById('message-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (text) {
    messages.push({ type: 'text', user: username.username, text, color: username.color });
    localStorage.setItem(`room_msgs_${room}`, JSON.stringify(messages));
    renderMessages(messages);
    input.value = '';
  }
});

// --- Pin location ---
document.getElementById('pin-location').addEventListener('click', function() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported in your browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      messages.push({
        type: 'location',
        user: username.username,
        color: username.color,
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6)
      });
      localStorage.setItem(`room_msgs_${room}`, JSON.stringify(messages));
      renderMessages(messages);
    },
    (err) => {
      alert('Could not get your location.');
    },
    { enableHighAccuracy: true }
  );
});

// --- Listen for localStorage changes from other tabs ---
window.addEventListener('storage', function(e) {
  if (e.key === `room_msgs_${room}`) {
    messages = JSON.parse(e.newValue || '[]');
    renderMessages(messages);
  }
  if (e.key === `room_users_${room}` || e.key === `room_blocked_${room}`) {
    renderUserList();
  }
});

// --- QR code generation ---
const roomUrl = window.location.origin + window.location.pathname + '?room=' + room;
// Hidden QR for flash only
const flashQr = new QRious({
  element: document.getElementById('flash-qr-code'),
  value: roomUrl,
  size: 360
});
const qr = new QRious({
  element: document.getElementById('qr-code'),
  value: roomUrl,
  size: 200
});

// --- Manual join form for room codes ---
document.getElementById('join-room-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let code = document.getElementById('join-room-input').value.trim().toUpperCase();
  if (/^\d{6}[A-Z]$/.test(code)) {
    window.location.search = '?room=' + code;
  } else {
    alert('Please enter a valid room code (6 digits and 1 letter, e.g. 123456A).');
  }
});

// --- QR button flash logic ---
const qrBtn = document.getElementById('qr-btn');
const flashQrDiv = document.getElementById('flash-qr');
let qrHoldTimeout;
qrBtn.addEventListener('mousedown', () => {
  qrBtn.classList.add('hold');
  qrHoldTimeout = setTimeout(() => {
    flashQrDiv.classList.add('show');
  }, 200);
});
qrBtn.addEventListener('mouseup', () => {
  qrBtn.classList.remove('hold');
  clearTimeout(qrHoldTimeout);
  flashQrDiv.classList.remove('show');
});
qrBtn.addEventListener('mouseleave', () => {
  qrBtn.classList.remove('hold');
  clearTimeout(qrHoldTimeout);
  flashQrDiv.classList.remove('show');
});
flashQrDiv.addEventListener('mousedown', () => {
  flashQrDiv.classList.remove('show');
});

// --- CODE button flash logic ---
const codeBtn = document.getElementById('code-btn');
const flashCodeDiv = document.getElementById('flash-code');
const flashCodeWhole = document.getElementById('flash-code-whole');
let codeHoldTimeout;
codeBtn.addEventListener('mousedown', () => {
  codeBtn.classList.add('hold');
  codeHoldTimeout = setTimeout(() => {
    flashCodeWhole.textContent = room;
    flashCodeDiv.classList.add('show');
  }, 200);
});
codeBtn.addEventListener('mouseup', () => {
  codeBtn.classList.remove('hold');
  clearTimeout(codeHoldTimeout);
  flashCodeDiv.classList.remove('show');
});
codeBtn.addEventListener('mouseleave', () => {
  codeBtn.classList.remove('hold');
  clearTimeout(codeHoldTimeout);
  flashCodeDiv.classList.remove('show');
});
flashCodeDiv.addEventListener('mousedown', () => {
  flashCodeDiv.classList.remove('show');
});
