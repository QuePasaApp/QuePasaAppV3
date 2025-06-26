// --- Color pool: 8 primary colors ---
const COLORS = [
  { name: "Red",    hex: "#e74c3c" },
  { name: "Blue",   hex: "#3498db" },
  { name: "Green",  hex: "#27ae60" },
  { name: "Yellow", hex: "#f1c40f" },
  { name: "Orange", hex: "#e67e22" },
  { name: "Purple", hex: "#9b59b6" },
  { name: "Pink",   hex: "#fd79a8" },
  { name: "Cyan",   hex: "#00bcd4" }
];

// --- Room code logic ---
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

// --- Local storage group user management (for test/local mode) ---
function getUsersInRoom(room) {
  const data = localStorage.getItem(`room_users_${room}`);
  return data ? JSON.parse(data) : [];
}
function saveUsersInRoom(room, users) {
  localStorage.setItem(`room_users_${room}`, JSON.stringify(users));
}
function assignColor(room) {
  const users = getUsersInRoom(room);
  const takenColors = users.map(u => u.color);
  const available = COLORS.filter(c => !takenColors.includes(c.name));
  if (available.length === 0) return null;
  return available[0]; // Assign first available color
}
function addUserToRoom(room) {
  let users = getUsersInRoom(room);
  if (users.length >= 8) return null; // Room full
  const color = assignColor(room);
  if (!color) return null; // Room full
  const userObj = { username: `Mr ${color.name}`, color: color.name };
  // Prevent duplicate colors
  if (!users.find(u => u.color === color.name)) {
    users.push(userObj);
    saveUsersInRoom(room, users);
    localStorage.setItem(`anon_user_${room}`, JSON.stringify(userObj));
    return userObj;
  }
  return null;
}
function removeUserFromRoom(room, colorName) {
  let users = getUsersInRoom(room);
  users = users.filter(u => u.color !== colorName);
  saveUsersInRoom(room, users);
}

// --- On join: assign user or deny if room full ---
let userObj = JSON.parse(localStorage.getItem(`anon_user_${room}`) || "null");
if (!userObj) {
  userObj = addUserToRoom(room);
  if (!userObj) {
    alert("Room is full (8 users, 8 colors only).");
    document.body.innerHTML = "<h2 style='text-align:center'>Room is full!</h2>";
    throw new Error('Room full');
  }
}
const username = userObj.username;
const userColor = COLORS.find(c => c.name === userObj.color)?.hex || '#888';

// --- UI setup ---
document.title = "QuePasaAppV3";
document.getElementById('room-info').textContent = `Room Code: ${room}`;
document.getElementById('user-info').textContent = `You are: ${username}`;
document.getElementById('leave-room-btn').classList.add('show');

// --- Sounds ---
const clickSound = document.getElementById('btn-click-sound');
const whipSound = document.getElementById('btn-whip-sound');
const whisperSound = document.getElementById('whisper-sound');
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
function playWhisper() {
  if (whisperSound) {
    whisperSound.volume = 0.16; // Soft
    whisperSound.currentTime = 0;
    whisperSound.play();
  }
}
document.addEventListener('click', function(e) {
  if (e.target.closest('button')) playBtnClick();
});

// --- Poll logic (local/test version) ---
let pollActive = false;
let pollVotes = {}; // { color: "yes"/"no" }
let pollVoters = []; // List of users who voted

function isHost() {
  const users = getUsersInRoom(room);
  return users.length && users[0].username === username;
}
function showStartPollBtn() {
  document.getElementById('start-poll-btn').style.display = isHost() && !pollActive ? "" : "none";
}
function showPollQuestion() {
  document.getElementById('poll-question').style.display = pollActive ? "" : "none";
  document.getElementById('poll-results').style.display = "none";
}
function showPollResults() {
  const votes = Object.values(pollVotes);
  const voters = Object.keys(pollVotes);
  const yesCount = votes.filter(v => v === "yes").length;
  const noCount = votes.filter(v => v === "no").length;
  const users = getUsersInRoom(room);
  let html = `<b>Poll Results:</b><br>
    👍 Yep: <b>${yesCount}</b> &nbsp; | &nbsp; 👎 Nope: <b>${noCount}</b><br><br>
    <b>Voted:</b> ${voters.map(c => {
      const u = users.find(u => u.color === c);
      return u ? u.username : '';
    }).filter(Boolean).join(', ') || 'Nobody yet.'}
    <br>`;
  document.getElementById('poll-results').innerHTML = html;
  document.getElementById('poll-results').style.display = "";
}
function resetPoll() {
  pollActive = false;
  pollVotes = {};
  pollVoters = [];
  showStartPollBtn();
  showPollQuestion();
  document.getElementById('poll-results').style.display = "none";
}
// Poll UI hooks
document.getElementById('start-poll-btn').onclick = function() {
  pollActive = true;
  pollVotes = {};
  pollVoters = [];
  showStartPollBtn();
  showPollQuestion();
};
document.getElementById('vote-yes').onclick = function() {
  if (!pollActive) return;
  pollVotes[userObj.color] = "yes";
  pollVoters.push(userObj.color);
  showPollResults();
};
document.getElementById('vote-no').onclick = function() {
  if (!pollActive) return;
  pollVotes[userObj.color] = "no";
  pollVoters.push(userObj.color);
  showPollResults();
};
// For host: end poll after everyone has voted or a timeout (local only)
function checkPollComplete() {
  const users = getUsersInRoom(room);
  if (Object.keys(pollVotes).length === users.length && users.length > 0) {
    setTimeout(resetPoll, 3000); // Show for 3s, then reset
  }
}
setInterval(() => {
  if (pollActive) checkPollComplete();
}, 1200);

// Whenever roster changes or user joins/leaves:
function afterUserChange() {
  renderUserList();
  showStartPollBtn();
  showPollQuestion();
  showPollResults();
}
afterUserChange();

// --- Render user roster, host kick logic ---
function renderUserList() {
  const users = getUsersInRoom(room);
  let html = `<b>Users (${users.length}/8):</b><div class='user-roster'>`;
  const host = users.length ? users[0].username : null;
  COLORS.forEach(c => {
    const user = users.find(u => u.color === c.name);
    html += `<div class='user-roster-item'>
      <span class='color-dot' style='background:${c.hex}'></span>
      <span>${user ? user.username : ''}</span>
      ${user && host === username && user.username !== username ? 
        `<button class='kick-btn' data-color='${c.name}' title='Kick'>🚫</button>` : ``}
    </div>`;
  });
  html += "</div>";
  document.getElementById('user-list').innerHTML = html;
  document.querySelectorAll('.kick-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const colorName = this.getAttribute('data-color');
      if (confirm(`Kick Mr ${colorName}?`)) {
        playWhip();
        removeUserFromRoom(room, colorName);
        if (userObj.color === colorName) {
          localStorage.removeItem(`anon_user_${room}`);
          alert('You have been kicked from this room.');
          window.location.reload();
        } else {
          afterUserChange();
        }
      }
    };
  });
  showStartPollBtn();
}

// --- Messages State, saved per room ---
let messages = JSON.parse(localStorage.getItem(`room_msgs_${room}`) || '[]');

function renderMessages(messages) {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  messages.forEach(msg => {
    const color = COLORS.find(c => c.name === msg.color)?.hex || '#888';
    const div = document.createElement('div');
    div.className = 'message';
    div.style.background = color;
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
    messages.push({ type: 'text', user: username, color: userObj.color, text });
    if (messages.length > 200) messages = messages.slice(-200);
    localStorage.setItem(`room_msgs_${room}`, JSON.stringify(messages));
    renderMessages(messages);
    input.value = '';
  }
});

// --- PIN LOCATION: Hold for 10 seconds to activate ---
const pinLocationBtn = document.getElementById('pin-location');
const pinStatus = document.getElementById('pin-location-status');
let holdTimer = null;
let holdProgress = 0;
let holding = false;

function resetPinStatus() {
  pinStatus.style.display = "none";
  pinStatus.textContent = "Hold to pin...";
  pinLocationBtn.disabled = false;
  holdProgress = 0;
  holding = false;
}
pinLocationBtn.addEventListener('mousedown', function(e) {
  if (holding) return;
  holding = true;
  pinStatus.textContent = "Keep holding (10s)...";
  pinStatus.style.display = "";
  pinLocationBtn.disabled = true;
  let seconds = 10;
  holdProgress = 0;
  holdTimer = setInterval(() => {
    holdProgress++;
    pinStatus.textContent = `Keep holding (${seconds - holdProgress}s)...`;
    if (holdProgress >= 10) {
      clearInterval(holdTimer);
      pinStatus.textContent = "Pinning...";
      pinLocationBtn.disabled = true;
      pinLocationBtn.style.opacity = 0.7;
      doPinLocation();
      setTimeout(() => {
        resetPinStatus();
        pinLocationBtn.style.opacity = 1;
      }, 1200);
    }
  }, 1000);
});
pinLocationBtn.addEventListener('mouseup', function() {
  if (holdTimer) clearInterval(holdTimer);
  resetPinStatus();
});
pinLocationBtn.addEventListener('mouseleave', function() {
  if (holdTimer) clearInterval(holdTimer);
  resetPinStatus();
});
pinLocationBtn.addEventListener('touchstart', function(e) {
  e.preventDefault();
  if (holding) return;
  holding = true;
  pinStatus.textContent = "Keep holding (10s)...";
  pinStatus.style.display = "";
  pinLocationBtn.disabled = true;
  let seconds = 10;
  holdProgress = 0;
  holdTimer = setInterval(() => {
    holdProgress++;
    pinStatus.textContent = `Keep holding (${seconds - holdProgress}s)...`;
    if (holdProgress >= 10) {
      clearInterval(holdTimer);
      pinStatus.textContent = "Pinning...";
      pinLocationBtn.disabled = true;
      pinLocationBtn.style.opacity = 0.7;
      doPinLocation();
      setTimeout(() => {
        resetPinStatus();
        pinLocationBtn.style.opacity = 1;
      }, 1200);
    }
  }, 1000);
}, {passive: false});
pinLocationBtn.addEventListener('touchend', function() {
  if (holdTimer) clearInterval(holdTimer);
  resetPinStatus();
}, {passive: false});
pinLocationBtn.addEventListener('touchcancel', function() {
  if (holdTimer) clearInterval(holdTimer);
  resetPinStatus();
}, {passive: false});
function doPinLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported in your browser.');
    resetPinStatus();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      messages.push({
        type: 'location',
        user: username,
        color: userObj.color,
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6)
      });
      if (messages.length > 200) messages = messages.slice(-200);
      localStorage.setItem(`room_msgs_${room}`, JSON.stringify(messages));
      renderMessages(messages);
    },
    () => alert('Could not get your location.'),
    { enableHighAccuracy: true }
  );
}

// --- Listen for localStorage changes from other tabs ---
window.addEventListener('storage', function(e) {
  if (e.key === `room_msgs_${room}`) {
    messages = JSON.parse(e.newValue || '[]');
    renderMessages(messages);
  }
  if (e.key === `room_users_${room}`) {
    afterUserChange();
  }
});

// --- Big QR code generation (always visible) ---
const roomUrl = window.location.origin + window.location.pathname + '?room=' + room;
new QRious({
  element: document.getElementById('qr-code-big'),
  value: roomUrl,
  size: 320
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

// --- CODE button flash logic: show big centered room code ---
const codeBtn = document.getElementById('code-btn');
const codeBtnSpan = document.getElementById('code-btn-code');
if (codeBtnSpan) codeBtnSpan.textContent = room;

// --- NEW ROOM Button ---
document.getElementById('new-room-btn').onclick = function() {
  const newRoom = generateRoomCode();
  window.location.search = '?room=' + newRoom;
};

// --- LEAVE ROOM Button ---
const leaveBtn = document.getElementById('leave-room-btn');
if (leaveBtn) {
  leaveBtn.style.display = "";
  leaveBtn.onclick = function() {
    if (confirm("Are you sure you want to leave the room?")) {
      localStorage.removeItem(`anon_user_${room}`);
      let users = getUsersInRoom(room).filter(u => u.color !== userObj.color);
      saveUsersInRoom(room, users);
      window.location.href = window.location.pathname; // Reload to new room/code
    }
  };
}
