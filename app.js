require('dotenv').config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const favicon = require('serve-favicon');
const hbs = require('hbs');
const mongoose = require('mongoose');
const logger = require('morgan');
const path = require('path');

const session = require('express-session');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User.model')
const flash = require('connect-flash');


mongoose
  .connect('mongodb://localhost/passport-roles', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  })
  .then(x => console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`))
  .catch(err => console.error('Error connecting to mongo', err));


const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();


app.use(flash());

passport.serializeUser((user, callback) => {
  callback(null, user._id);
});


passport.deserializeUser((id, callback) => {
  User.findById(id)
    .then(user => {
      callback(null, user);
    })
    .catch(error => {
      callback(error);
    });
});



passport.use(
  new LocalStrategy(
    { passReqToCallback: true },
    (req, username, password, callback) => {
      User.findOne({ username })
        .then(user => {
          if (!user) {
            return callback(null, false, { message: 'Nome de usuário ou senha incorretos' });
          }
          callback(null, user);
        })
        .catch(error => {
          callback(error);
        });
    }
  )
);


// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express View engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

// default value for title local
app.locals.title = 'Express - Generated with IronGenerator';


app.use(
  session({
    secret: 'our-passport-local-strategy-app',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 5000000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const index = require('./routes/index.routes');
app.use('/', index);


// admin route middleware

const adminRoutes = require('./routes/admin.routes');
app.use('/admin',(req, res, next) => {
  const { user } = req;

  if (user.accessLevel === 'BOSS') {
    next();
    return;
  }

  res.redirect('/login');
} ,adminRoutes);


// private route middleware

const authRoutes = require('./routes/auth.routes');
app.use('/employee',(req, res, next) => {
  const { user } = req;

  if (user.accessLevel !== 'BOSS') {
    next();
    return;
  }

  res.redirect('/login');
}, authRoutes);



const coursesRoutes = require('./routes/courses.routes');
app.use('/courses',(req, res, next) => {
  const { user } = req;

  if (user.accessLevel === 'TA') {
    next();
    return;
  }

  res.redirect('/login');
}, coursesRoutes);


module.exports = app;
