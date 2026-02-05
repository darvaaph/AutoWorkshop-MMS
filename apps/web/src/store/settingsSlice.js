import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  shopName: '',
  shopAddress: '',
  shopPhone: '',
  shopLogoUrl: null,
  printerWidth: '80mm',
  footerMessage: '',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings(state, action) {
      return { ...state, ...action.payload };
    },
    updateSetting(state, action) {
      const { key, value } = action.payload;
      if (key in state) {
        state[key] = value;
      }
    },
  },
});

export const { setSettings, updateSetting } = settingsSlice.actions;

export default settingsSlice.reducer;