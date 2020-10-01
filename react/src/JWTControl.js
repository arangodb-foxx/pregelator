function getCurrentJwt() {
  return sessionStorage.getItem('jwt');
}

function getCurrentJwtUsername() {
  return sessionStorage.getItem('jwtUser');
}

function setCurrentJwt(jwt, username) {
  sessionStorage.setItem('jwt', jwt);
  sessionStorage.setItem('jwtUser', username);
}

function getAuthConfig() {
  return {
    headers: {
      Authorization: 'bearer ' + getCurrentJwt()
    }
  }
}

const jwtControl = {
  getCurrentJwt: getCurrentJwt,
  getCurrentJwtUsername: getCurrentJwtUsername,
  setCurrentJwt: setCurrentJwt,
  getAuthConfig: getAuthConfig
}

export default jwtControl;