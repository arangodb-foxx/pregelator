import React, {useContext, createContext, useEffect, useReducer} from 'react';
import {get, put} from "axios";
import {toast} from "react-toastify";
import jwtControl from "./JWTControl";

const initialState = {
  userDefinedAlgorithms: {},
  selectedAlgorithm: null,
  selfDispatch: () => {}
};

const loadAlgorithms = (dispatch) => ({
  type: "fetch",
  payload: dispatch
});

const setData = (data) => ({
  type: "setData",
  payload: data
});


export const storeAlgorithm = (name, data) => ({
  type: "store",
  payload: {name, data}
});

export const selectAlgorithm = (name) => ({
  type: "select",
  payload: name
});

const reducer = (state, action) => {
  switch (action.type) {
    case "fetch": {
      const disp = action.payload;
      get(process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'userDefinedAlgorithms', jwtControl.getAuthConfig())
      .then((res) => {
        disp(setData(res.data));
      }, (error) => {
        toast.error(`This should only occur in dev mode if your foxx app is not deployed, ` + error);
      });
      return {...state, selfDispatch: disp};
    }
    case "setData":
      return {...state, userDefinedAlgorithms: action.payload};
    case "store":
      {
        const {name, data} = action.payload;
        put(process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'userDefinedAlgorithms/' + name, data, jwtControl.getAuthConfig())
        .then(() => {
          state.selfDispatch(selectAlgorithm(name));
          toast(`Successfully stored: ${name}.`);
        }, (err) => {
          toast.error(`Failed to save ${name}! Error: ${err}`);
        });
        const {userDefinedAlgorithms} = state;
        userDefinedAlgorithms[name] = {algorithm: JSON.parse(data)};
        return {...state, userDefinedAlgorithms };
      }
      case "select": {
        const name = action.payload;
        if (state.userDefinedAlgorithms.hasOwnProperty(name)) {
          return {...state, selectedAlgorithm: name};
        }
        // If this does not exist do not do any harm
        return state;
      }
      default:
        break;
  }
  // Ignore unhandled actions.
  return state;
};

const UserDefinedAlgorithmsContext = createContext(initialState);

export const UserDefinedAlgorithmsProvider = props => {
  const algoContext = useReducer(reducer, initialState);

  const [, dispatch] = algoContext;


/*
  const [userDefinedAlgorithms, setUserDefinedAlgorithms] = useState({});

  const fetchData = function () {
    get(process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'userDefinedAlgorithms')
      .then(res => {
        setUserDefinedAlgorithms(res.data)
      })
  }
*/
  useEffect(() => {
    dispatch(loadAlgorithms(dispatch))
  }, [dispatch]);

  return (
    <UserDefinedAlgorithmsContext.Provider value={algoContext}>
      {props.children}
    </UserDefinedAlgorithmsContext.Provider>
  );
}

export const useUserDefinedAlgorithms = () => useContext(UserDefinedAlgorithmsContext);