import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://lira365.com/api', // 기존 LIRA 웹 프로젝트의 API 서버 주소
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
