const CustomError = require('../errors')
const { isTokenValid } = require('../utils')

const authenticateUser = async (req, res, next) => {
  const token = req.signedCookies.token

  if (!token) {
    throw new CustomError.UnauthenticatedError(`Vous n'êtes pas authentifié`)
  }

  try {
    const { userId, role } = isTokenValid({ token })
    req.user = { userId, role }
    next()
  } catch (error) {
    throw new CustomError.UnauthenticatedError(`Vous n'êtes pas authentifié`)
  }
}


const authorizePermissions = (...roles) => {

  return (req, res, next) => {
    if(!roles.includes(req.user.role)){
      throw new CustomError.UnauthorizedError(`Vous n'avez pas les droits nécessaires`)
    }
    next()
  }
}

module.exports = {
  authenticateUser, 
  authorizePermissions
}