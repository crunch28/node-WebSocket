const SocketIO = require('socket.io');
const axios = require('axios');

 //express 서버와 연결
module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: '/socket.io' });

  //room과 chat으로 각각 네임스페이스 이벤트 리스너를 위해 분리
  app.set('io', io);
  const room = io.of('/room'); // 네임스페이스 부여 메서드 of
  const chat = io.of('/chat');

  // 세션 미들웨어
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  //클라이언트 접속했을 때 발생
  room.on('connection', (socket) => {
    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  //클라이언트 접속했을 때 발생
  chat.on('connection', (socket) => {
    console.log('chat 네임스페이스에 접속');
    const req = socket.request;
    const { headers: { referer } } = req;
    const roomId = referer
      .split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');
    socket.join(roomId);
    socket.to(roomId).emit('join', {
      user: 'system',
      chat: `${req.session.color}님이 입장하셨습니다.`,
    });
    socket.on('disconnect', () => {
      console.log('chat 네임스페이스 접속 해제');
      socket.leave(roomId);
      const currentRoom = socket.adapter.rooms[roomId]; // 참여중인 소켓 정보
      const userCount = currentRoom ? currentRoom.length : 0; // 사용자 카운트
      if (userCount === 0) {
        axios.delete(`http://localhost:8005/room/${roomId}`) //사용자가 0이면 방삭제
          .then(() => {
            console.log('방 제거 요청 성공');
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        socket.to(roomId).emit('exit', { //퇴장알림
          user: 'system',
          chat: `${req.session.color}님이 퇴장하셨습니다.`,
        });
      }
    });
  });
};
