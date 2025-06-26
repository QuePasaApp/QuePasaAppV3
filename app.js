// --- App constants ---
const APP_NAME = "QuePasaAppV3";

// --- Room Code Logic ---
function randomRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Get or set 6-character room code in URL
let params = new URLSearchParams(window.location.search);
let room = params.get('room');
if (!room || !/^[A-Z0-9]{6}$/.test(room)) {
  room = randomRoomCode();
  params.set('room', room);
  window.location.search = params.toString();
}

// --- Sci-fi word lists for optional future use ---
// (not used here since we use 6-char code)
const sciFiWords1 = [
  'nebula', 'quantum', 'android', 'cyber', 'zenith', 'stellar', 'galaxy', 'hyper', 'plasma', 'nova', 'cosmic', 'cypher'
];
const sciFiWords2 = [
  'blaster', 'vortex', 'matrix', 'starlight', 'horizon', 'drone', 'photon', 'core', 'orbit', 'alloy', 'sentinel', 'pulse'
];

// --- Color pool (primary + gold/silver, exclude white) ---
const COLOR_MAP = {
  Red: '#e74c3c',
  Blue: '#3498db',
  Yellow: '#f1c40f',
  Green: '#27ae60',
  Purple: '#9b59b6',
  Orange: '#e67e22',
  Gold: '#ffd700',
  Silver: '#bdc3c7'
};
const COLORS = Object.keys(COLOR_MAP);
const TITLES = ['Mr', 'Ms', 'Mx'];

// --- Generate or retrieve username ---
function getUsername() {
  let user = localStorage.getItem('anon_user');
  if (!user) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const title = TITLES[Math.floor(Math.random() * TITLES.length)];
    user = `${title} ${color}`;
    localStorage.setItem('anon_user', user);
  }
  return user;
}

// Extract color from username
function getUserColor(username) {
  for (const color of COLORS) {
    if (username.includes(color)) return COLOR_MAP[color];
  }
  return '#888';
}

// --- Room Management (local only) ---
function getRoomOwner(room) {
  let owner = localStorage.getItem(`room_owner_${room}`);
  if (!owner) {
    owner = username; // First user to create the room is owner
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
if (blocked.includes(username)) {
  alert('You have been removed from this room.');
  removeUserFromRoom(room, username);
  document.body.innerHTML = `<h2>You have been removed from this room.</h2>`;
  throw new Error('Blocked');
}

addUserToRoom(room, username);

// --- UI setup ---
document.title = APP_NAME;
document.getElementById('room-info').textContent = `Room Code: ${room} (Owner: ${owner})`;
document.getElementById('user-info').textContent = `You are: ${username}`;

// --- Messages State ---
let messages = JSON.parse(localStorage.getItem(`room_msgs_${room}`) || '[]');

// --- Render user list for owner ---
function renderUserList() {
  const listDiv = document.getElementById('user-list');
  const users = getUsersInRoom(room);
  if (username === owner) {
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
    div.style.background = getUserColor(msg.user);
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
    messages.push({ type: 'text', user: username, text });
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
        user: username,
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
const qr = new QRious({
  element: document.getElementById('qr-code'),
  value: roomUrl,
  size: 80
});

// Click and hold to enlarge QR code
let qrTimeout;
const qrContainer = document.getElementById('qr-container');
qrContainer.addEventListener('mousedown', () => {
  qrTimeout = setTimeout(() => {
    qr.set({ size: 320 });
    qrContainer.style.zIndex = 10;
    qrContainer.style.position = 'absolute';
    qrContainer.style.background = '#fff';
    qrContainer.style.border = '2px solid #333';
  }, 300); // long-press
});
qrContainer.addEventListener('mouseup', () => {
  clearTimeout(qrTimeout);
  qr.set({ size: 80 });
  qrContainer.style.position = 'relative';
  qrContainer.style.background = 'none';
  qrContainer.style.border = 'none';
  qrContainer.style.zIndex = 1;
});
qrContainer.addEventListener('mouseleave', () => {
  clearTimeout(qrTimeout);
  qr.set({ size: 80 });
  qrContainer.style.position = 'relative';
  qrContainer.style.background = 'none';
  qrContainer.style.border = 'none';
  qrContainer.style.zIndex = 1;
});

// --- Manual join form for room codes ---
document.getElementById('join-room-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let code = document.getElementById('join-room-input').value.trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(code)) {
    window.location.search = '?room=' + code;
  } else {
    alert('Please enter a valid 6-character room code (letters and numbers only).');
  }
});
