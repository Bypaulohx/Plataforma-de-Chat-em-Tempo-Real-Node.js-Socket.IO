const socket = io();
const naclLib = window.nacl;
const naclUtil = window.nacl ? window.nacl.util : window.naclUtil;

if (!naclLib || !naclUtil) {
  alert('Biblioteca de criptografia não carregada. Verifique a conexão com CDN.');
}

// gerar par de chaves para este cliente (volatile - muda a cada reload)
const keyPair = naclLib.box.keyPair();
const myPublicKey = naclUtil.encodeBase64(keyPair.publicKey);
// secretKey (Uint8Array) is keyPair.secretKey

let currentRoomId = null;
let currentUsers = {}; // socketId -> { username, publicKey }

// UI refs
const createForm = document.getElementById('create-room-form');
const joinForm = document.getElementById('join-room-form');
const createUsername = document.getElementById('create-username');
const createRoomName = document.getElementById('create-room-name');
const createRoomPass = document.getElementById('create-room-pass');
const joinUsername = document.getElementById('join-username');
const joinRoomId = document.getElementById('join-room-id');
const joinRoomPass = document.getElementById('join-room-pass');
const roomInfo = document.getElementById('room-info');
const roomIdSpan = document.getElementById('room-id');
const leaveBtn = document.getElementById('leave-room');
const usersList = document.getElementById('users-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

// helpers UI
function appendMessage({ from, text, me=false }){
  const d = document.createElement('div');
  d.className = 'message ' + (me? 'me' : 'them');
  d.innerHTML = `<strong>${from}</strong><div>${escapeHtml(text)}</div>`;
  messagesDiv.appendChild(d);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUsersList(users){
  currentUsers = users || {};
  usersList.innerHTML = '';
  for (const [sid, u] of Object.entries(currentUsers)){
    const el = document.createElement('div');
    el.textContent = `${u.username} ${sid===socket.id ? '(você)' : ''}`;
    usersList.appendChild(el);
  }
}

function escapeHtml(unsafe) {
  return unsafe
       .replaceAll('&', '&amp;')
       .replaceAll('<', '&lt;')
       .replaceAll('>', '&gt;')
       .replaceAll('\"', '&quot;')
       .replaceAll("'", '&#039;');
}

// create room
createForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const username = createUsername.value.trim() || 'Anon';
  const roomName = createRoomName.value.trim();
  const pass = createRoomPass.value.trim();
  socket.emit('create-room', { roomName, passphrase: pass, username, publicKey: myPublicKey }, (res)=>{
    if (res && res.ok){
      enterRoom(res.roomId);
      alert('Sala criada: ' + res.roomId);
    } else {
      alert('Erro ao criar sala: ' + (res && res.error));
    }
  });
});

// join room
joinForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const username = joinUsername.value.trim() || 'Anon';
  const roomId = joinRoomId.value.trim();
  const pass = joinRoomPass.value.trim();
  socket.emit('join-room', { roomId, passphrase: pass, username, publicKey: myPublicKey }, (res)=>{
    if (res && res.ok){
      enterRoom(res.roomId);
    } else {
      alert('Erro ao entrar na sala: ' + (res && res.error));
    }
  });
});

function enterRoom(roomId){
  currentRoomId = roomId;
  roomIdSpan.textContent = roomId;
  roomInfo.classList.remove('hidden');
}

leaveBtn.addEventListener('click', ()=>{
  if (!currentRoomId) return;
  socket.emit('leave-room', { roomId: currentRoomId });
  currentRoomId = null;
  roomInfo.classList.add('hidden');
  usersList.innerHTML = '';
  messagesDiv.innerHTML = '';
});

// send message (encrypt per-recipient)
sendBtn.addEventListener('click', ()=>{
  const text = messageInput.value.trim();
  if (!text || !currentRoomId) return;

  const recipients = Object.keys(currentUsers).filter(id => id !== socket.id);
  if (recipients.length === 0){
    appendMessage({ from: 'Você', text, me:true });
    messageInput.value = '';
    return;
  }

  const payloads = recipients.map(rid => {
    const recipient = currentUsers[rid];
    const nonce = naclLib.randomBytes(naclLib.box.nonceLength);
    const cipher = naclLib.box(naclUtil.decodeUTF8(text), nonce, naclUtil.decodeBase64(recipient.publicKey), keyPair.secretKey);
    return {
      toSocketId: rid,
      ciphertext: naclUtil.encodeBase64(cipher),
      nonce: naclUtil.encodeBase64(nonce),
      senderPublicKey: myPublicKey
    };
  });

  socket.emit('send-encrypted', { roomId: currentRoomId, messages: payloads });
  appendMessage({ from: 'Você', text, me:true });
  messageInput.value = '';
});

// receive encrypted
socket.on('encrypted-message', ({ fromSocketId, fromUsername, ciphertext, nonce, senderPublicKey }) => {
  try {
    const decrypted = naclLib.box.open(naclUtil.decodeBase64(ciphertext), naclUtil.decodeBase64(nonce), naclUtil.decodeBase64(senderPublicKey), keyPair.secretKey);
    if (!decrypted) {
      appendMessage({ from: fromUsername || 'Anônimo', text: '(não foi possível decifrar)' });
      return;
    }
    const text = naclUtil.encodeUTF8(decrypted);
    appendMessage({ from: fromUsername || 'Anônimo', text });
  } catch (e) {
    console.error('decrypt error', e);
    appendMessage({ from: fromUsername || 'Anônimo', text: '(erro ao decifrar)' });
  }
});

// room data (list of users + public keys)
socket.on('room-data', ({ roomId, users }) => {
  updateUsersList(users);
});

// emoji picker
emojiBtn.addEventListener('click', ()=>{
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

emojiPicker.addEventListener('emoji-click', (e)=>{
  messageInput.value += e.detail.unicode;
});

// helper: log our public key in console so dev can inspect
console.log('My public key (base64):', myPublicKey);

// convenience: press Enter to send
messageInput.addEventListener('keydown', (ev)=>{
  if (ev.key === 'Enter') { ev.preventDefault(); sendBtn.click(); }
});
