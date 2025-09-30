import { combineReducers } from "redux";
import { planReducer } from "./plans.Reducer";
import { kycReducer } from "./kycuser";

export const mainReducers = combineReducers({
  planReducer,
  kycReducer,
});
