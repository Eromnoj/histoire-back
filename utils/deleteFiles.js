const path = require('path')
const fs = require('fs')


const deleteFiles = (pathName, filter) => {
  //check if folder exists
  if (!fs.existsSync(pathName)) {
    console.log('Folder does not exists :', pathName);
  }
  //select all elements from the folder
  const files = fs.readdirSync(pathName)
  //browser through the elements
  files.forEach(file => {
    //if the file name begin with the filter, delete it
    if (file.startsWith(filter)) {
      const filename = path.join(pathName, file)
      fs.unlinkSync(filename)
    }
  })
}

module.exports = deleteFiles