import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null, // { uid, email, phoneNumber, role }
  loading: false,
}

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    logout(state) {
      state.user = null
    },
  },
})

export const { setUser, setLoading, logout } = slice.actions
export default slice.reducer
