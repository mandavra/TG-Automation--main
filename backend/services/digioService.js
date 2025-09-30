const axios = require('axios');
require('dotenv').config();

const DIGIO_CLIENT_ID = process.env.DIGIO_CLIENT_ID;
const DIGIO_CLIENT_SECRET = process.env.DIGIO_CLIENT_SECRET;

const headers = {
  'Authorization': 'Basic ' + Buffer.from(`${DIGIO_CLIENT_ID}:${DIGIO_CLIENT_SECRET}`).toString('base64'),
  'Content-Type': 'application/json'
};

exports.uploadPDF = async (payload) => {
  try {
    const response = await axios.post(
      'https://api.digio.in/v2/client/document/uploadpdf',
      payload,
      { headers }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

exports.getCreditStatus = async () => {
  try {
    const response = await axios.get(
      'https://api.digio.in/v2/client/credits',
      { headers }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};
