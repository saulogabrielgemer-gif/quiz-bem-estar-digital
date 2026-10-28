const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
  pingTimeout: 20000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;
app.use(express.static("public"));

const QUESTIONS = [
  {
    question: "O que significa bem-estar digital?",
    options: [
      "Usar a tecnologia de forma saudável e equilibrada",
      "Ficar conectado o dia inteiro",
      "Abandonar toda tecnologia",
      "Usar apenas redes sociais"
    ],
    correct: 0,
    explanation: "Bem-estar digital é equilibrar o uso da tecnologia com descanso, estudos e relações pessoais."
  },
  {
    question: "Qual atitude ajuda a evitar o uso excessivo de telas?",
    options: [
      "Usar o celular durante todas as atividades",
      "Estabelecer limites para o tempo de tela",
      "Ignorar o horário de dormir",
      "Deixar vídeos tocando o dia todo"
    ],
    correct: 1,
    explanation: "Definir limites ajuda a dividir o tempo entre telas e outras atividades."
  },
  {
    question: "Como avaliar uma informação encontrada na internet?",
    options: [
      "Acreditar nela se tiver muitas curtidas",
      "Compartilhar antes de ler",
      "Verificar a fonte e comparar com fontes confiáveis",
      "Confiar em qualquer título"
    ],
    correct: 2,
    explanation: "Curtidas não garantem que uma informação seja verdadeira. Verifique a fonte."
  },
  {
    question: "Por que fazer pausas das telas pode ser útil?",
    options: [
      "Porque resolve todos os problemas automaticamente",
      "Porque elimina a necessidade de dormir",
      "Porque impede qualquer emoção negativa",
      "Porque permite descansar e fazer outras atividades"
    ],
    correct: 3,
    explanation: "Pausas ajudam a descansar e abrir espaço para outras atividades."
  },
  {
    question: "Qual exemplo valoriza relações significativas fora da internet?",
    options: [
      "Conversar com a família e passar tempo com amigos",
      "Ignorar quem está falando com você",
      "Cancelar todos os encontros presenciais",
      "Usar o celular durante toda conversa"
    ],
    correct: 0,
    explanation: "Conversas e atividades presenciais podem fortalecer vínculos."
  },
  {
    question: "Como as redes sociais podem influenciar a saúde mental?",
    options: [
      "Nunca influenciam sentimentos",
      "Podem influenciar pensamentos, sentimentos e emoções",
      "Afetam todas as pessoas exatamente da mesma maneira",
      "Sempre causam efeitos negativos"
    ],
    correct: 1,
    explanation: "A influência varia: pode ser positiva ou negativa, dependendo da pessoa e da situação."
  },
  {
    question: "Uma pessoa sente que está passando tempo demais online. O que pode ajudar?",
    options: [
      "Ignorar como isso afeta sua rotina",
      "Deixar de conversar com todo mundo",
      "Planejar horários para telas, descanso e convivência",
      "Aumentar o tempo online sem pensar"
    ],
    correct: 2,
    explanation: "Planejar horários pode ajudar a criar uma rotina mais equilibrada."
  },
  {
    question: "Qual frase resume melhor o objetivo do bem-estar digital?",
    options: [
      "A tecnologia deve substituir as amizades",
      "É melhor nunca usar aparelhos",
      "O importante é estar sempre online",
      "Aproveitar a tecnologia sem deixar que prejudique o bem-estar"
    ],
    correct: 3,
    explanation: "O objetivo é aproveitar os benefícios da tecnologia com equilíbrio."
  }
];

const rooms = new Map();
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function cleanName(value) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, 18);
}

function publicPlayers(room) {
  return [...room.players.values()]
    .map(p => ({ id: p.id, name: p.name, score: p.score, answered: p.answered }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-BR"));
}

function sendLobby(room) {
  io.to(room.code).emit("lobby-update", {
    code: room.code,
    players: publicPlayers(room),
    state: room.state
  });
}

function clearQuestionTimer(room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
}

function finishQuestion(room) {
  if (room.state !== "question") return;
  clearQuestionTimer(room);
  room.state = "reveal";
  const q = QUESTIONS[room.questionIndex];
  io.to(room.code).emit("question-result", {
    correctIndex: q.correct,
    explanation: q.explanation,
    players: publicPlayers(room),
    questionIndex: room.questionIndex,
    totalQuestions: QUESTIONS.length
  });
}

function startQuestion(room) {
  clearQuestionTimer(room);
  room.state = "question";
  room.questionStartedAt = Date.now();
  room.players.forEach(p => { p.answered = false; });
  const q = QUESTIONS[room.questionIndex];
  io.to(room.code).emit("question-start", {
    questionIndex: room.questionIndex,
    totalQuestions: QUESTIONS.length,
    question: q.question,
    options: q.options,
    durationSeconds: room.durationSeconds,
    endsAt: room.questionStartedAt + room.durationSeconds * 1000
  });
  sendLobby(room);
  room.timer = setTimeout(() => finishQuestion(room), room.durationSeconds * 1000);
}

function finishGame(room) {
  clearQuestionTimer(room);
  room.state = "finished";
  io.to(room.code).emit("game-finished", {
    players: publicPlayers(room),
    totalQuestions: QUESTIONS.length
  });
  sendLobby(room);
}

io.on("connection", socket => {
  socket.on("host-create", ({ name, durationSeconds } = {}, callback = () => {}) => {
    const hostName = cleanName(name) || "Apresentador";
    const code = makeCode();
    const duration = Number(durationSeconds);
    const room = {
      code,
      hostId: socket.id,
      hostName,
      players: new Map(),
      state: "lobby",
      questionIndex: -1,
      durationSeconds: Number.isFinite(duration) ? Math.min(60, Math.max(10, Math.round(duration))) : 20,
      timer: null,
      createdAt: Date.now()
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.hostRoom = code;
    callback({ ok: true, code, hostName, players: [] });
    sendLobby(room);
  });

  socket.on("player-join", ({ code, name } = {}, callback = () => {}) => {
    const roomCode = String(code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    const playerName = cleanName(name);
    if (!room) return callback({ ok: false, error: "Sala não encontrada. Confira o código." });
    if (room.state !== "lobby") return callback({ ok: false, error: "A partida já começou. Peça ao apresentador para criar outra sala." });
    if (!playerName) return callback({ ok: false, error: "Digite um apelido." });
    if (room.players.size >= 100) return callback({ ok: false, error: "Esta sala atingiu o limite de 100 jogadores." });
    if ([...room.players.values()].some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      return callback({ ok: false, error: "Esse apelido já está sendo usado nesta sala." });
    }
    room.players.set(socket.id, { id: socket.id, name: playerName, score: 0, answered: false });
    socket.join(roomCode);
    socket.data.playerRoom = roomCode;
    callback({ ok: true, code: roomCode, name: playerName });
    sendLobby(room);
  });

  socket.on("host-start", ({ code } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostId !== socket.id) return callback({ ok: false, error: "Você não é o apresentador desta sala." });
    if (room.state !== "lobby") return callback({ ok: false, error: "A partida já foi iniciada." });
    if (room.players.size < 1) return callback({ ok: false, error: "Espere pelo menos um jogador entrar." });
    room.questionIndex = 0;
    callback({ ok: true });
    startQuestion(room);
  });

  socket.on("player-answer", ({ answer } = {}, callback = () => {}) => {
    const roomCode = socket.data.playerRoom;
    const room = rooms.get(roomCode);
    const player = room && room.players.get(socket.id);
    if (!room || !player || room.state !== "question") return callback({ ok: false, error: "Não há pergunta aberta." });
    if (player.answered) return callback({ ok: false, error: "Você já respondeu esta pergunta." });
    const chosen = Number(answer);
    if (!Number.isInteger(chosen) || chosen < 0 || chosen > 3) return callback({ ok: false, error: "Resposta inválida." });
    player.answered = true;
    const elapsed = Date.now() - room.questionStartedAt;
    const q = QUESTIONS[room.questionIndex];
    const correct = chosen === q.correct;
    if (correct) {
      const remaining = Math.max(0, room.durationSeconds * 1000 - elapsed);
      player.score += 500 + Math.round(500 * remaining / (room.durationSeconds * 1000));
    }
    callback({ ok: true, correct });
    io.to(room.code).emit("answer-count", {
      answered: [...room.players.values()].filter(p => p.answered).length,
      total: room.players.size
    });
    sendLobby(room);
    if ([...room.players.values()].every(p => p.answered)) finishQuestion(room);
  });

  socket.on("host-next", ({ code } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostId !== socket.id) return callback({ ok: false, error: "Você não é o apresentador desta sala." });
    if (room.state !== "reveal") return callback({ ok: false, error: "A pergunta ainda não terminou." });
    if (room.questionIndex + 1 >= QUESTIONS.length) {
      finishGame(room);
    } else {
      room.questionIndex += 1;
      startQuestion(room);
    }
    callback({ ok: true });
  });

  socket.on("host-end", ({ code } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    clearQuestionTimer(room);
    io.to(room.code).emit("room-closed", { message: "O apresentador encerrou esta sala." });
    rooms.delete(room.code);
  });

  socket.on("disconnect", () => {
    const playerRoomCode = socket.data.playerRoom;
    const playerRoom = rooms.get(playerRoomCode);
    if (playerRoom) {
      playerRoom.players.delete(socket.id);
      sendLobby(playerRoom);
      if (playerRoom.state === "question" && playerRoom.players.size > 0 &&
          [...playerRoom.players.values()].every(p => p.answered)) finishQuestion(playerRoom);
    }
    const hostRoomCode = socket.data.hostRoom;
    const hostRoom = rooms.get(hostRoomCode);
    if (hostRoom && hostRoom.hostId === socket.id) {
      clearQuestionTimer(hostRoom);
      io.to(hostRoom.code).emit("room-closed", { message: "O apresentador se desconectou. A sala foi encerrada." });
      rooms.delete(hostRoom.code);
    }
  });
});

setInterval(() => {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff) {
      clearQuestionTimer(room);
      io.to(code).emit("room-closed", { message: "A sala expirou." });
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000).unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Quiz disponível na porta ${PORT}`);
});
