const initialState = {
    plans: [],
    plan: null,
    planLoading: false,
    planError: null,
    planSuccess: false,
}

export const planReducer = (state = initialState, action) => {
    switch (action.type) {
        case "ADD_NEW_PLANS":
            return {
                ...state,
                plans: [...state.plans, action.payload],
                planSuccess: true,
            };
        case "GET_PLANS":
            return {
                ...state,
                plans: action.payload,
            };

        default:
            return state;
    }
}