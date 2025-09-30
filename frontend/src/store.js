import { applyMiddleware, compose, createStore } from "redux";
import { thunk } from "redux-thunk";
import { mainReducers } from "./services/reducers";
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
  mainReducers,
  composeEnhancers(applyMiddleware(thunk))
);
