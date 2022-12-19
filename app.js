require('dotenv').config();
require('express-async-errors');

//extra security packages
const helmet = require('helmet')
const cors = require('cors')
const xss = require('xss-clean')
const rateLimiter = require('express-rate-limit')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const fileUpload = require('express-fileupload')


const express = require('express');
const app = express();

const connectDB = require('./db/connect')

// extra package Rate limiter
app.set('trust proxy', 1)
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, //15 minutes (milliseconds)
    max: 200
  })
)

app.use(express.json());

//extra security packages
app.use(helmet())
app.use(cors())
app.use(xss())

// //Middlewares
const notFoundMiddleware = require('./middleware/not-found')
const errorHandlerMiddleware = require('./middleware/error-handler')

// //Auth routes
const authRouter = require('./routes/authRoutes')
// //User routes
const userRouter = require('./routes/userRoutes')
// //Book routes
const bookRouter = require('./routes/bookRoutes')
// //Chapter routes
const chapterRouter = require('./routes/chapterRoutes')


app.use(morgan('tiny'))
app.use(express.json())
app.use(express.static(('./public')))
app.use(cookieParser(process.env.JWT_SECRET))
app.use(fileUpload())

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/user', userRouter)
app.use('/api/v1/book', bookRouter)
app.use('/api/v1/chapter', chapterRouter)


app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI)
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
