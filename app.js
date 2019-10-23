const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const ColorHash = require('color-hash');
require('dotenv').config();

const webSocket = require('./socket');
const indexRouter = require('./routes');
const connect = require('./schemas');

const app = express(); //express 패키지 호출
connect(); // 몽고디비 연결

// 세션설정
const sessionMiddleware = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
});

// express 설정
app.set('views', path.join(__dirname, 'views')); //경로 설정
app.set('view engine', 'pug'); // views 파일확장자 pug
app.set('port', process.env.PORT || 8005); //포트번호 설정

//미들웨어 설정
app.use(morgan('dev')); //로그기록
app.use(express.static(path.join(__dirname, 'public'))); // 정적파일 제공
app.use('/gif', express.static(path.join(__dirname, 'uploads'))); // 파일제공
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET)); //쿠키설정
app.use(sessionMiddleware); //세션미들웨어
app.use(flash()); //일회성 메시지처리

// 사용자이름 랜덤색상 설정
app.use((req, res, next) => {
  if (!req.session.color) {
    const colorHash = new ColorHash();
    req.session.color = colorHash.hex(req.sessionID);
  }
  next();
});

app.use('/', indexRouter); //라우터 연결부분

//404 또는 에러처리 미들웨어
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

//에러 핸들러 미들웨어
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

const server = app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기중');
});

webSocket(server, app, sessionMiddleware); //웹 소켓
