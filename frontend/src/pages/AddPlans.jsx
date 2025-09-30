import {
  FilePlus,
  Trash2,
  Pencil,
  Search,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  IndianRupee,
  Layers,
  Clock,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  addplanasync,
  deleteplanasync,
  getplansasync,
  updateplanasync,
} from "../services/action/plan.Action";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const AddPlanForm = () => {
  const dispatch = useDispatch();
  const { plans } = useSelector((state) => state.planReducer);
  const [formData, setFormData] = useState({
    mrp: "",
    highlight: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderedPlans, setOrderedPlans] = useState([]);
  const [planType, setPlanType] = useState("Base");
  const [durationUnit, setDurationUnit] = useState("day");
  const [durationValue, setDurationValue] = useState(1);

  const isValidMrp = Number(formData.mrp) > 0;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "type") setPlanType(value);
    else if (name === "durationUnit") setDurationUnit(value);
    else if (name === "durationValue") setDurationValue(Number(value));
    else setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValidMrp) return toast.error("Please enter a valid MRP.");
    try {
      const duration = `${durationValue} ${durationUnit}${durationValue > 1 ? 's' : ''}`;
      const data = {
        ...formData,
        type: planType,
        duration,
      };
      if (isEditing && editId) {
        dispatch(updateplanasync(editId, data));
      } else {
        dispatch(addplanasync(data));
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      try {
        dispatch(deleteplanasync(id));
        toast.info("Plan deleted successfully");
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete plan");
      }
    }
  };

  const handleEdit = (id) => {
    const planToEdit = plans.find((plan) => plan._id === id);
    if (planToEdit) {
      setFormData({
        mrp: planToEdit.mrp,
        highlight: planToEdit.highlight,
      });
      setPlanType(planToEdit.type);
      // Parse duration like '20 days', '2 months', '1 year'
      const match = (planToEdit.duration || '').match(/(\d+)\s*(\w+)/);
      if (match) {
        setDurationValue(Number(match[1]));
        let unit = match[2].toLowerCase();
        if (unit.endsWith('s')) unit = unit.slice(0, -1);
        setDurationUnit(unit);
      } else {
        setDurationValue(1);
        setDurationUnit('day');
      }
      setIsEditing(true);
      setEditId(id);
    }
  };

  const resetForm = () => {
    setFormData({ mrp: "", highlight: false });
    setPlanType("Base");
    setDurationUnit("day");
    setDurationValue(1);
    setIsEditing(false);
    setEditId(null);
    setSubmitted(false);
  };

  const inputClass = (isValid) =>
    `flex-1 px-4 py-2 rounded-xl border ${
      isValid ? "border-green-500" : "border-red-500"
    } dark:border-opacity-70 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
      isValid ? "focus:ring-green-500" : "focus:ring-red-500"
    }`;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:4000/api/plans/get");
        dispatch(getplansasync(response.data));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch plans");
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [dispatch]);

  const filteredPlans = searchOrderId
    ? plans.filter((plan) =>
        plan._id?.toLowerCase().includes(searchOrderId.toLowerCase())
      )
    : plans;

  useEffect(() => {
    setOrderedPlans(
      [...(filteredPlans || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );
  }, [filteredPlans]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(orderedPlans);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderedPlans(items);

    // Send new order to backend
    try {
      await axios.post("http://localhost:4000/api/plans/reorder", {
        orderedIds: items.map(plan => plan._id)
      });
    } catch (error) {
      toast.error("Failed to save new order!");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-0">

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md flex flex-wrap gap-4 items-center"
      >
        <div className="flex items-center gap-2 w-full md:w-auto">
          <FilePlus className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {isEditing ? "Update Plan" : "Add Plan"}
          </span>
        </div>

        <div className="relative w-full md:w-auto">
          <IndianRupee className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="number"
            name="mrp"
            placeholder="MRP"
            min="1"
            value={formData.mrp}
            onChange={handleChange}
            className={`pl-9 ${
              submitted
                ? inputClass(isValidMrp)
                : "flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            }`}
            required
          />
        </div>

        {/* Plan Type */}
        <div className="relative">
          <Layers className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            name="type"
            value={planType}
            onChange={handleChange}
            className="pl-9 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter plan type (e.g. Base, Pro, Enterprise)"
            required
          />
        </div>
        {/* Duration */}
        <div className="relative flex gap-2 items-center">
          <Clock className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            name="durationUnit"
            value={durationUnit}
            onChange={handleChange}
            className="pl-9 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
          <input
            type="number"
            name="durationValue"
            min="1"
            value={durationValue}
            onChange={handleChange}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
            placeholder="e.g. 20"
            required
          />
        </div>

        <div className="flex items-center gap-2 md:w-auto">
          <Star
            className={`w-5 h-5 ${
              formData.highlight ? "text-yellow-500" : "text-gray-400"
            }`}
          />
          <label className="text-gray-700 dark:text-gray-200 font-medium">
            Highlight
          </label>
          <input
            type="checkbox"
            name="highlight"
            checked={formData.highlight}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition w-full md:w-auto"
          >
            {isEditing ? "Update" : "Add"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-white px-6 py-2 rounded-xl hover:bg-gray-400 dark:hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>


      <div className="my-6 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            className="pl-10 w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="max-w-full max-h-[300px] custom-scrollbar overflow-x-auto overflow-y-auto rounded-xl shadow-md border dark:border-gray-700">
        {loading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-300">
            Loading plans...
          </div>
        ) : orderedPlans.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="plans">
              {(provided) => (
                <table
                  className="min-w-[800px] w-full bg-white dark:bg-gray-800 dark:text-white text-sm text-left"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10 text-gray-700 dark:text-gray-300 text-center">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">MRP</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Highlight</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    {orderedPlans.map((plan, index) => (
                      <Draggable key={plan._id} draggableId={plan._id} index={index}>
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 ${
                              snapshot.isDragging ? "bg-blue-100 dark:bg-blue-900" : ""
                            }`}
                          >
                            <td className="p-4 break-all">{plan._id || "N/A"}</td>
                            <td className="p-4">{plan.mrp}</td>
                            <td className="p-4">{plan.type}</td>
                            <td className="p-4 capitalize">{plan.duration}</td>
                            <td className="p-4">
                              {plan.highlight ? (
                                <span className="text-green-600 font-medium">Yes</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="p-4 flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(plan._id)}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs transition"
                                title="Edit Plan"
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(plan._id)}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs transition"
                                title="Delete Plan"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-300">
            No matching plans found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPlanForm;
