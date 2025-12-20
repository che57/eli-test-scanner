import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface HealthResponse {
  status: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

interface HealthState {
  data: HealthResponse | null;
  error: ApiError | null;
}

const initialState: HealthState = {
  data: null,
  error: null,
};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    setHealthData: (state, action: PayloadAction<HealthResponse | null>) => {
      state.data = action.payload;
      state.error = null;
    },
    setHealthError: (state, action: PayloadAction<any>) => {
      state.error = action.payload;
      state.data = null;
    },
    clearHealthError: (state) => {
      state.error = null;
    },
  },
});

export const { setHealthData, setHealthError, clearHealthError } = healthSlice.actions;
export default healthSlice.reducer;
