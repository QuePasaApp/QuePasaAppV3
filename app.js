// Color pool (primary + gold/silver, exclude white)
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

// Generate or retrieve username
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

// Room Management (demo: local only)
function getRoom() {
  let room = localStorage.getItem('room_name');
  if (!room) {
    room = prompt('Enter a room name:') || 'default-room';
    localStorage.setItem('room_name', room);
  }
  return room;
}
function getRoomOwner(room) {
  let owner = localStorage.getItem(`room_owner_${room}`);
  if (!owner) {
    owner = username; // First user to create the room is owner
    localStorage.setItem(`room_owner_${room}`, owner);
  }
  return owner;
}

// Track users in room (local demo)
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

// BLOCKED USERS (demo)
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

// App state
const username = getUsername();
const room = getRoom();
const owner = getRoomOwner(room);

// Room access control
const blocked = getBlockedUsers(room);
if (blocked.includes(username)) {
  alert('You have been removed from this room.');
  // Remove from users list and redirect or freeze UI
  removeUserFromRoom(room, username);
  document.body.innerHTML = '<h2>You have been removed from this room.</h2>';
  throw new Error('Blocked');
}

addUserToRoom(room, username);

// UI setup
document.getElementById('room-info').textContent = `Room: ${room} (Owner: ${owner})`;
document.getElementById('user-info').textContent = `You are: ${username}`;

// State
let messages = JSON.parse(localStorage.getItem(`room_msgs_${room}`) || '[]');

// Render user list for owner
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

// Render messages
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

// Send text message
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

// Pin location
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
    }
  );
});

// Listen for localStorage changes from other tabs
window.addEventListener('storage', function(e) {
  if (e.key === `room_msgs_${room}`) {
    messages = JSON.parse(e.newValue || '[]');
    renderMessages(messages);
  }
  if (e.key === `room_users_${room}` || e.key === `room_blocked_${room}`) {
    renderUserList();
  }
});
