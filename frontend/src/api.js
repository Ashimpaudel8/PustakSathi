import axios from "axios"
import { Access_Token, Refresh_Token } from "./constants"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(Access_Token);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        const isAuthEndpoint = originalRequest.url.includes("/api/token/")

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true

            try {
                const refreshToken = localStorage.getItem(Refresh_Token)
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/token/refresh/`,
                    { refresh: refreshToken }
                )

                localStorage.setItem(Access_Token, res.data.access)

                originalRequest.headers.Authorization = `Bearer ${res.data.access}`
                return api(originalRequest)

            } catch (refreshError) {
                localStorage.clear()
                window.location.href = "/login"
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

export default api