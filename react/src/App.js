import React, {useState} from "react";

// 3rd Party
import {post} from "axios";
import {
  Form,
  FormField,
  TextInput,
  Box,
  Button,
  Collapsible,
  Grommet,
  Layer,
  ResponsiveContext,
} from 'grommet';
import {FormClose, Notification} from 'grommet-icons';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contexts
import {ExecutionProvider} from "./ExecutionContext";
import {PregelProvider} from './PregelContext';
import {SmartGraphListProvider} from "./SmartGraphListContext";

// Components
import RunningPregelList from "./RunningPregelList";
import AppBarInfo from "./AppBarInfo";
import JSONEditor from "./JSONEditor";
import {UserDefinedAlgorithmsProvider} from "./UserDefinedAlgorithmsContext";

const theme = {
  global: {
    colors: {
      brand: '#7D4CDB',
    },
    font: {
      family: 'Roboto',
      size: '18px',
      height: '20px',
    },
  },
};

const AppBar = (props) => (
  <Box
    tag='header'
    direction='row'
    align='center'
    justify='between'
    background='brand'
    pad={{left: 'medium', right: 'small', vertical: 'small'}}
    elevation='medium'
    style={{zIndex: '1'}}
    {...props}
  />
);

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

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");

  function loginMethod(username, password) {
    post(
      process.env.REACT_APP_ARANGODB_COORDINATOR_BASE + '_open/auth',
      {
        username: username,
        password: password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((response) => {
        console.log(response);
        var jwtParts = response.data.jwt.split('.');

        if (!jwtParts[1]) {
          throw new Error('Invalid JWT');
        }

        if (!window.atob) {
          throw new Error('base64 support missing in browser');
        }
        //var payload = JSON.parse(atob(jwtParts[1]));
        //const activeUser = payload.preferred_username;

        setCurrentJwt(response.data.jwt, username)
        setUserLoggedIn(true);
      }, (error) => {
        toast.error("Login failed: " + error);
        setCurrentJwt(null, null);
      })
      .catch((err) => {
        toast.error("Login failed!");
        setCurrentJwt(null, null);
      });
  }

  if (userLoggedIn) {
    return (
      <PregelProvider>
        <ExecutionProvider>
          <SmartGraphListProvider>
            <UserDefinedAlgorithmsProvider>
              <Grommet theme={theme} full>
                <ResponsiveContext.Consumer>
                  {size => (
                    <Box fill>
                      <AppBar>
                        <AppBarInfo></AppBarInfo>
                        <Button
                          icon={<Notification/>}
                          onClick={() => setShowSidebar(!showSidebar)}
                        />
                      </AppBar>
                      <ToastContainer position="bottom-left" autoClose={10000}
                                      style={{width: (window.outerWidth / 2)}}/>
                      <Box direction='row' flex overflow={{horizontal: 'hidden'}}>
                        <Box flex>
                          <JSONEditor>
                          </JSONEditor>
                        </Box>

                        {(!showSidebar || size !== 'small') ? (
                          <Collapsible direction="horizontal" open={showSidebar}>
                            <Box
                              flex
                              pad='small'
                              width='medium'
                              background='light-2'
                              elevation='small'
                            >
                              <RunningPregelList/>
                            </Box>
                          </Collapsible>
                        ) : (
                          <Layer>
                            <Box
                              background='light-2'
                              tag='header'
                              justify='end'
                              align='center'
                              direction='row'
                            >
                              <Button
                                icon={<FormClose/>}
                                onClick={() => setShowSidebar(false)}
                              />
                            </Box>
                            <Box
                              fill
                              background='light-2'
                              align='center'
                              justify='center'
                            >
                              sidebar
                            </Box>
                          </Layer>
                        )}
                      </Box>
                    </Box>
                  )}
                </ResponsiveContext.Consumer>
              </Grommet>
            </UserDefinedAlgorithmsProvider>
          </SmartGraphListProvider>
        </ExecutionProvider>
      </PregelProvider>
    );
  } else {
    return (
      <Grommet theme={theme} full>
        <Box style={{margin: "large"}}>
          <Form
            //value={userName}
            onChange={values => {
              console.log(values);
              if (values.hasOwnProperty('username')) {
                setUserName(values.username)
              }
              if (values.hasOwnProperty('password')) {
                setUserPassword(values.password)
              }
            }
            }
            onReset={() => setUserName({})}
            onSubmit={values => {
              loginMethod(userName, userPassword)
            }}
          >
            <FormField name="name" htmlfor="text-username-input-id" label="Name">
              <TextInput id="text-username-input-id" name="username"/>
            </FormField>
            <FormField name="password" htmlfor="text-password-input-id" label="Password">
              <TextInput id="text-password-input-id" name="password"/>
            </FormField>
            <Box direction="row" gap="medium">
              <Button type="submit" primary label="Login" margin={{left: 'small'}}/>
              <Button type="reset" label="Clear"/>
            </Box>
          </Form>
        </Box>
        <ToastContainer position="bottom-left" autoClose={10000}
                        style={{width: (window.outerWidth / 2)}}/>
      </Grommet>
    )
  }
  /*return (
    <UserProvider>
      <LoginView></LoginView>
      <AppView></AppView>
    </UserProvider>
  )*/
}


export default App;
