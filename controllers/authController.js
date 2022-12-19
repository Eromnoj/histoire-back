const User = require('../models/User')
const Recovery = require('../models/Recovery')

const { StatusCodes } = require('http-status-codes')
const CustomError = require('../errors')
const { attachCookiesToResponse, createTokenUser } = require('../utils')

const sgMail = require('@sendgrid/mail')
const jwt = require('jsonwebtoken')

const register = async (req, res) => {
  const { email, username, password } = req.body
  const emailAlreadyExists = await User.findOne({ email })

  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError('Email already exists')
  }

  // first registered user is an admin
  const isFirstAcccount = await User.countDocuments({}) === 0;
  const role = isFirstAcccount ? 'admin' : 'user'

  const user = await User.create({ email, username, password, role })
  const tokenUser = createTokenUser(user)

  attachCookiesToResponse({ user: tokenUser, res })


  res.status(StatusCodes.CREATED).json({ user: tokenUser })
}

const login = async (req, res) => {

  const { email, password } = req.body

  if (!email || !password) {
    throw new CustomError.BadRequestError('Please provide email and password')
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new CustomError.UnauthenticatedError('Invalid credentials')
  }

  const passwordVerification = await user.comparePassword(password)

  if (!passwordVerification) {
    throw new CustomError.UnauthenticatedError('Invalid credentials')
  }

  const tokenUser = createTokenUser(user)
  attachCookiesToResponse({ user: tokenUser, res })
  res.status(StatusCodes.OK).json({ user: tokenUser })

}

const logout = async (req, res) => {

  res.cookie('token', 'logout', {
    httpOnly: true,
    // expires: new Date(Date.now()),
    // secure: process.env.NODE_ENV === 'production',
    secure: true,
    signed: true,
    maxAge: -1,
    sameSite: 'none'
  })
  
  res.clearCookie('token')

  res.status(StatusCodes.OK).json({msg: 'User logged out'})
}

const sendRecoverEmail = async (req, res)=> {
  const { email, origin } = req.body
  console.log(email);
  const user = await User.findOne({email})

  if(user){ 

    const payload = {userId: user._id, email: user.email}
    console.log(payload);
    const token = jwt.sign(payload, process.env.JWT_MAIL, {
      expiresIn: process.env.JWT_MAIL_LIFETIME
    })

    const isAlreadyAsked = await Recovery.findOne({userId: user._id})
    if(isAlreadyAsked)
    {
      await Recovery.deleteOne({userId: user._id})
    }

    const recoverToken = await Recovery.create({token, userId: user._id})


    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
      to: email,
      from: 'j.moreschi@outlook.fr',
      Subject: 'Récupérer votre mot de passe',
      html: `<p>Vous avez demandé de changer de mot de passe, le lien suivant est valide durant 15min : </p>
      <br />
      <a href="${origin}/recover/${recoverToken._id}">Renouveller le mot de passe</a>`
    }

    sgMail.send(msg)
    .then(console.log('Email sent'))    
  }

  res.status(StatusCodes.OK).json({msg: 'Envoyé. Veuillez vérifier voitre boîte mail'})
}

const verifyTokenChangePassword = async (req,res)=> {
  const { id, password } = req.body

  if(!password){
    throw new CustomError.UnauthenticatedError('Vous devez entrer un nouveau mot de passe')
  }

  const recover = await Recovery.findOne({_id: id})
  if(!recover){
    throw new CustomError.BadRequestError('Lien non valide, veuillez en demander un autre')
  }
  
  const isRecoverTokenValid = jwt.verify(recover.token, process.env.JWT_MAIL)
  if(!isRecoverTokenValid){
    throw new CustomError.UnauthorizedError('Clé non valide, veuillez faire une nouvelle demande')
  }
  
  const {userId} = isRecoverTokenValid
  
  let user = await User.findOne({_id: userId })
  
  user.password = password
  user = await user.save()

  await Recovery.deleteOne({_id:id})


  res.status(StatusCodes.OK).json({msg: 'Mot de passe Changé avec succès'})
}

module.exports = {
  register,
  login,
  logout,
  sendRecoverEmail,
  verifyTokenChangePassword
}