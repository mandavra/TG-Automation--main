import axios from "axios";
import { toast } from "react-toastify";

export const addNewplans = (data) => {
  return {
    type: "ADD_NEW_PLANS",
    payload: data
  };
}
export const getplans=(data)=>{
  return {
    type: "GET_PLANS",
    payload: data,
  };
}
export const addplanasync = (data) => {
  console.log("data",data);
  
  return (dispatch) => {
    axios
      .post("http://localhost:4000/api/plans/add", data)
      .then((res) => {
        dispatch(addNewplans(res.data));
        toast.success("Plan added successfully!");
      })
      .catch((err) => {
        console.log(err);
        toast.error(`Error: ${err.message}`);
      });
  };
};

export const getplansasync = () => {
  return (dispatch) => {
    axios.get("http://localhost:4000/api/plans/get")
    .then((res) => {
      dispatch(getplans(res.data));
    })
    .catch((err) => {
      console.log(err.message);
      toast.error(`Error: ${err.message}`);
    });
  };
};

export const deleteplanasync = (id) => {
  return (dispatch) => {
    axios.delete(`http://localhost:4000/api/plans/delete/${id}`)
    .then((res)=>{
      dispatch(getplansasync());
      toast.success("Plan deleted successfully!");
    })
    .catch((err)=>{
      console.log(err);
      toast.error(`Error: ${err.message}`);
    });
  };
};

export const updateplanasync = (id, data) => {
  return (dispatch) => {
    axios.put(`http://localhost:4000/api/plans/edit/${id}`, data)
    .then((res)=>{
      dispatch(getplansasync());
      toast.success("Plan updated successfully!");
    })
    .catch((err)=>{
      console.log(err);
      toast.error(`Error: ${err.message}`);
    });
  };
}