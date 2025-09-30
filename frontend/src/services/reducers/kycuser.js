const initialState = {
    kycuser: {},
    kycNavigation: false,
}

export const kycReducer = (state = initialState, action) => {
    switch (action.type) {
        case "CREATE_USER":
            return {
                ...state,
                kycNavigation: true,
                kycuser: action.payload
            };

        default:
            return state;
    }
}