import axios from "axios";


const BASE_URL = "http://localhost:7070";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});


axiosInstance.interceptors.request.use(
  (config) => {
    if (!config.url.startsWith('/api/')) {
      config.url = '/api' + (config.url.startsWith('/') ? config.url : '/' + config.url);
    }
    
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);


axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    
    const enhancedError = {
      ...error,
      message: getErrorMessage(error)
    };
    
    
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(enhancedError);
  }
);


function getErrorMessage(error) {
  if (error.response) {
    
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data?.message || 'Bad request - please check your input';
      case 401:
        return 'Authentication required - please log in';
      case 403:
        return 'Access forbidden - insufficient permissions';
      case 404:
        return 'Resource not found - please check the URL';
      case 500:
        return 'Internal server error - please try again later';
      default:
        return data?.message || `Server error (${status})`;
    }
  } else if (error.request) {
    
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to server - please check if the server is running';
    } else if (error.code === 'ENOTFOUND') {
      return 'Server not found - please check the server address';
    } else if (error.code === 'TIMEOUT') {
      return 'Request timeout - server is taking too long to respond';
    } else {
      return 'Network error - please check your internet connection';
    }
  } else {
    
    return error.message || 'An unexpected error occurred';
  }
}


axiosInstance.checkHealth = async () => {
  try {
    const response = await axiosInstance.get('/auth/check-admin-exists', { timeout: 5000 });
    console.log('Health check successful:', response.status);
    return { available: true, status: response.status };
  } catch (error) {
    console.error('Health check failed:', error);
    return { 
      available: false, 
      error: getErrorMessage(error),
      details: error.response?.data || error.message
    };
  }
};


axiosInstance.testConnection = async () => {
  try {
    
    const response = await fetch(`${BASE_URL}/api/projects?page=1&pageSize=1`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      timeout: 5000
    });
    
    console.log('Connection test result:', response.status, response.statusText);
    return {
      success: true,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default axiosInstance;