
const session = require('express-session');


const sessionMiddleware = session({
    secret: 'dasfdg4538Jfdv8459-a0afa8mvg',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
    },
});



module.exports = { sessionMiddleware };