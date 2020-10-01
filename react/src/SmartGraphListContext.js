import React, {useState, createContext, useEffect} from 'react';
import {get} from "axios";
import {toast} from "react-toastify";
import jwtControl from "./JWTControl";

export const SmartGraphListContext = createContext();


export const SmartGraphListProvider = props => {
  const [graphs, setGraphs] = useState([]);

  const fetchData = function () {
    get(process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'graphs', jwtControl.getAuthConfig())
      .then((res) => setGraphs(res.data), (error) => {
        toast.error(`This should only occur in dev mode if your foxx app is not deployed, ` + error);
      });
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <SmartGraphListContext.Provider value={[graphs, setGraphs]}>
      {props.children}
    </SmartGraphListContext.Provider>
  );
}