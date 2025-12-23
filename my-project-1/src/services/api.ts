import axios from 'axios';

// Define the base URL for the external API
const BASE_URL = 'https://api.example.com';

// Example function to fetch data from an external API
export const fetchData = async (endpoint: string): Promise<any> => {
    try {
        const response = await axios.get(`${BASE_URL}/${endpoint}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch data from the external API');
    }
};

// Example function to post data to an external API
export const postData = async (endpoint: string, data: any): Promise<any> => {
    try {
        const response = await axios.post(`${BASE_URL}/${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('Error posting data:', error);
        throw new Error('Failed to post data to the external API');
    }
};

// Additional service functions can be added here