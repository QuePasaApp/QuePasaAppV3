// ---- FIREBASE IMPLEMENTATION (DROP-IN) ----
// 1. Add your Firebase config below.
// 2. Exports functions for room/user/poll management, including auto-delete.
// 3. Use these hooks in your app.js in place of local/test logic.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ----- USER MANAGEMENT -----
export async function joinRoom(roomCode, userObj) {
  await db.ref('rooms/' + roomCode + '/users/' + userObj.color).set(userObj);
}
export async function leaveRoom(roomCode, color) {
  await db.ref('rooms/' + roomCode + '/users/' + color).remove();
  // Trigger auto-delete check
  autoDeleteRoomIfEmpty(roomCode);
}
export function listenForUsers(roomCode, callback) {
  db.ref('rooms/' + roomCode + '/users').on('value', snap => {
    const val = snap.val() || {};
    callback(Object.values(val));
  });
}

// ----- KICK -----
export async function kickUser(roomCode, color) {
  await leaveRoom(roomCode, color);
}

// ----- MESSAGES -----
export async function sendMessage(roomCode, msgObj) {
  await db.ref('rooms/' + roomCode + '/messages').push(msgObj);
}
export function listenForMessages(roomCode, callback) {
  db.ref('rooms/' + roomCode + '/messages').on('value', snap => {
    const val = snap.val() || {};
    callback(Object.values(val));
  });
}

// ----- POLL -----
export async function startPoll(roomCode) {
  await db.ref('rooms/' + roomCode + '/poll').set({active:true, votes:{}});
}
export async function votePoll(roomCode, color, vote) {
  await db.ref('rooms/' + roomCode + '/poll/votes/' + color).set(vote);
}
export function listenForPoll(roomCode, callback) {
  db.ref('rooms/' + roomCode + '/poll').on('value', snap => {
    callback(snap.val());
  });
}
export async function endPoll(roomCode) {
  await db.ref('rooms/' + roomCode + '/poll').remove();
}

// ----- AUTO SELF-DELETE (client-side, robust version should be a Cloud Function) -----
export async function autoDeleteRoomIfEmpty(roomCode) {
  const snap = await db.ref('rooms/' + roomCode + '/users').once('value');
  if (!snap.exists() || Object.keys(snap.val()).length === 0) {
    await db.ref('rooms/' + roomCode).remove();
  }
}

// ----- USAGE EXAMPLE -----
// In your app.js, swap all localStorage user/message/poll logic for these methods
// and listen for updates:
// - listenForUsers(room, renderUserList)
// - listenForMessages(room, renderMessages)
// - listenForPoll(room, renderPollArea)
