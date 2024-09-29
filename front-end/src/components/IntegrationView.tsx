import { useState, useEffect } from 'react';
import { Box, Button, Container, TextField, Typography, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';

const IntegrationView = () => {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('baseUrl') || 'https://');
  const [apiKey, setApiKey] = useState('');
  const [method, setMethod] = useState('GET'); // State to handle HTTP method
  const [queryParams, setQueryParams] = useState([{ key: 'startDate', value: '' }]);
  const [bodyData, setBodyData] = useState(''); // State for request body data (if needed)
  const [fetchResponse, setFetchResponse] = useState(null);

  // Update the baseUrl in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('baseUrl', baseUrl);
  }, [baseUrl]);

  const handleAddQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  const handleQueryParamChange = (index, keyOrValue, newValue) => {
    const updatedParams = [...queryParams];
    updatedParams[index][keyOrValue] = newValue;
    setQueryParams(updatedParams);
  };

  const buildUrl = () => {
    let url = baseUrl;
    if (!url.endsWith('?') && !url.includes('?')) {
      url += '?';
    }

    queryParams.forEach(param => {
      if (param.key && param.value) {
        url += `${param.key}=${encodeURIComponent(param.value)}&`;
      }
    });

    return url.slice(0, -1); // Remove the trailing "&"
  };

  const handleFetchData = async () => {
    const functions = getFunctions();
    const fetchPrograms = httpsCallable(functions, 'fetchPrograms');

    try {
      const url = buildUrl();
      
      // Create request options based on the selected method
      const requestOptions = {
        url,
        method, // Pass the selected method
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      };

      // Include body data if the method is POST or PUT
      if (method === 'POST' || method === 'PUT') {
        requestOptions.data = JSON.parse(bodyData);
      }

      // Call Cloud Function with request options
      const response = await fetchPrograms(requestOptions);
      setFetchResponse(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <Container>
      <Box>
        <Typography variant="h4">Integration Management</Typography>
        
        {/* Base URL */}
        <TextField
          label="Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          fullWidth
          margin="normal"
          helperText="Edit the base URL for the API request."
        />

        {/* Method Selector */}
        <FormControl fullWidth margin="normal">
          <InputLabel>HTTP Method</InputLabel>
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <MenuItem value="GET">GET</MenuItem>
            <MenuItem value="POST">POST</MenuItem>
            <MenuItem value="PUT">PUT</MenuItem>
            <MenuItem value="DELETE">DELETE</MenuItem>
          </Select>
        </FormControl>

        {/* API Key */}
        <TextField
          label="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          fullWidth
          margin="normal"
        />
        
        {/* Query Parameters */}
        {queryParams.map((param, index) => (
          <Box key={index} display="flex">
            <TextField
              label="Key"
              value={param.key}
              onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
              margin="normal"
            />
            <TextField
              label="Value"
              value={param.value}
              onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
              margin="normal"
            />
          </Box>
        ))}
        <Button onClick={handleAddQueryParam}>Add Query Parameter</Button>

        {/* Body Data Input (only visible if POST or PUT is selected) */}
        {(method === 'POST' || method === 'PUT') && (
          <TextField
            label="Request Body (JSON)"
            value={bodyData}
            onChange={(e) => setBodyData(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={4}
            helperText="Enter the JSON data for the request body."
          />
        )}

        {/* Fetch Button */}
        <Button variant="contained" color="primary" onClick={handleFetchData} style={{ marginTop: '20px' }}>
          Fetch Data
        </Button>

        {/* Display Fetch Response */}
        {fetchResponse && (
          <Box>
            <Typography variant="h6">Fetch Response:</Typography>
            <pre>{JSON.stringify(fetchResponse, null, 2)}</pre>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default IntegrationView;



