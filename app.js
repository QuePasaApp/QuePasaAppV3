// --- App constants ---
const APP_NAME = "QuePasaAppV3";

// --- Room Code Logic ---
function generateRoomCode() {
  const digits = Array.from({length: 6}, () => Math.floor(Math.random() * 10)).join('');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return digits + letter;
}
function getRoomCodeFromURL() {
  let params = new URLSearchParams(window.location.search);
  let room = params.get('room');
  if (!room || !/^\d{6}[A-Z]$/.test(room)) {
    room = generateRoomCode();
    params.set('room', room);
    window.history.replaceState({}, '', '?' + params.toString());
  }
  return room;
}
const room = getRoomCodeFromURL();

// --- Color pool (vibrant for user variety) ---
const COLOR_MAP = {
  Red: '#e74c3c', Blue: '#3498db', Yellow: '#f1c40f', Green: '#27ae60', Purple: '#9b59b6',
  Orange: '#e67e22', Gold: '#ffd700', Silver: '#bdc3c7', Pink: '#fd79a8', Teal: '#00b894',
  Indigo: '#6c5ce7', Brown: '#8d5524', Navy: '#2d3436', Lime: '#b2ff59', Cyan: '#00bcd4', Magenta: '#d500f9'
};
const COLORS = Object.keys(COLOR_MAP);
const TITLES = ['Mr', 'Ms', 'Mx', 'Dr', 'Prof'];

// --- Generate or retrieve username + random color per room join ---
function getUsernameObj() {
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
const usernameObj = getUsernameObj();
const username = usernameObj.username;
const userColor = COLOR_MAP[usernameObj.color] || '#888';

// --- Room Management (local only) ---
function getRoomOwner(room) {
  let owner = localStorage.getItem(`room_owner_${room}`);
  if (!owner) {
    owner = username;
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
const owner = getRoomOwner(room);
const blocked = getBlockedUsers(room);
if (blocked.includes(username)) {
  alert('You have been removed from this room.');
  removeUserFromRoom(room, username);
  document.body.innerHTML = `<h2 style="text-align:center;">You have been removed from this room.</h2>`;
  throw new Error('Blocked');
}
addUserToRoom(room, username);

// --- UI setup ---
document.title = APP_NAME;
document.getElementById('room-info').textContent = `Room Code: ${room} (Owner: ${owner})`;
document.getElementById('user-info').textContent = `You are: ${username}`;
document.getElementById('code-btn-code').textContent = room;

// --- Button sound setup ---
const clickSound = document.getElementById('btn-click-sound');
const whipSound = document.getElementById('btn-whip-sound');
function playBtnClick() {
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
}
function playWhip() {
  if (whipSound) {
    whipSound.currentTime = 0;
    whipSound.play();
  }
}
// Play click sound for all button clicks
document.addEventListener('click', function(e) {
  if (e.target.closest('button')) playBtnClick();
});

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
      btn.onclick = function(e) {
        e.stopPropagation();
        const userToKick = this.getAttribute('data-user');
        if (confirm(`Kick ${userToKick}?`)) {
          playWhip();
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
    let color = COLOR_MAP[(msg.color && COLORS.includes(msg.color)) ? msg.color : usernameObj.color] || '#888';
    if (!color && msg.user) {
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
    messages.push({ type: 'text', user: username, text, color: usernameObj.color });
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
        color: usernameObj.color,
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

// --- QR button flash logic (HOLD or HOVER) ---
const qrBtn = document.getElementById('qr-btn');
const flashQrDiv = document.getElementById('flash-qr');
let qrFlashActive = false;
function showQRFlash() {
  if (!qrFlashActive) {
    qrFlashActive = true;
    flashQrDiv.classList.add('show');
  }
}
function hideQRFlash() {
  qrFlashActive = false;
  flashQrDiv.classList.remove('show');
}
qrBtn.addEventListener('mouseenter', showQRFlash);
qrBtn.addEventListener('mouseleave', hideQRFlash);
qrBtn.addEventListener('mousedown', showQRFlash);
qrBtn.addEventListener('mouseup', hideQRFlash);
qrBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showQRFlash(); });
qrBtn.addEventListener('touchend', hideQRFlash);
flashQrDiv.addEventListener('mousedown', hideQRFlash);
flashQrDiv.addEventListener('touchstart', (e) => { e.preventDefault(); hideQRFlash(); });

// --- CODE button flash logic with stoplight and stop sign ---
const codeBtn = document.getElementById('code-btn');
const flashCodeDiv = document.getElementById('flash-code');
const flashCodeChar = document.getElementById('flash-code-char');
const stopSignSVG = `
  <svg width="120" height="120" viewBox="0 0 120 120">
    <polygon points="20,10 100,10 110,20 110,100 100,110 20,110 10,100 10,20" fill="#c0392b" stroke="#fff" stroke-width="7"/>
    <text x="60" y="78" font-size="54" font-family="Arial, Helvetica, sans-serif" fill="#fff" text-anchor="middle" font-weight="bold">STOP</text>
  </svg>
`;
let codeFlashInterval, codeFlashIndex, isFlashing = false;
const stoplightColors = ['stoplight-red', 'stoplight-yellow', 'stoplight-green', 'stoplight-green'];
function flashCodeSequence(code) {
  isFlashing = true;
  flashCodeDiv.classList.add('show');
  codeFlashIndex = 0;
  function showChar() {
    flashCodeChar.className = "";
    if (codeFlashIndex < code.length) {
      const colorClass = stoplightColors[codeFlashIndex % stoplightColors.length];
      flashCodeChar.classList.add(colorClass);
      flashCodeChar.innerHTML = code[codeFlashIndex];
    } else {
      flashCodeChar.classList.add('stoplight-stop');
      flashCodeChar.innerHTML = stopSignSVG;
    }
    codeFlashIndex++;
    if (codeFlashIndex <= code.length) {
      codeFlashInterval = setTimeout(showChar, 3000);
    } else {
      codeFlashIndex = 0;
      codeFlashInterval = setTimeout(showChar, 3000);
    }
  }
  showChar();
}
function stopFlashingCode() {
  isFlashing = false;
  clearTimeout(codeFlashInterval);
  flashCodeDiv.classList.remove('show');
  flashCodeChar.innerHTML = '';
  flashCodeChar.className = '';
}
codeBtn.addEventListener('mouseenter', () => {
  if (!isFlashing) flashCodeSequence(room);
});
codeBtn.addEventListener('mouseleave', stopFlashingCode);
codeBtn.addEventListener('mousedown', () => {
  if (!isFlashing) flashCodeSequence(room);
});
codeBtn.addEventListener('mouseup', stopFlashingCode);
codeBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!isFlashing) flashCodeSequence(room);
});
codeBtn.addEventListener('touchend', stopFlashingCode);
flashCodeDiv.addEventListener('mousedown', stopFlashingCode);
flashCodeDiv.addEventListener('touchstart', (e) => { e.preventDefault(); stopFlashingCode(); });
