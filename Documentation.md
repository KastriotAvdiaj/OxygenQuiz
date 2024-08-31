Important files in the application are explained here, why they are used, where they come and some more explanation of their inner functions

Api-client.ts :

This file is concerned with configuring an Axios instance for making API calls, including handling requests and response interceptors. 
 - `authRequestInterceptor`: An interceptor that modifies outgoing requests to ensure they include necessary headers and credentials.
 -- There are two types of interceptors : 
        1. Request Interceptors: These are functions that run before a request is sent to the server. They can be used to modify the request configuration (such as headers, URL, or data) before the request is sent.
        2. Response Interceptors: These are functions that run after the server sends a response but before the response is handed over to your code that called the Axios request. They can be used to modify the respose data or handle errors in a centralized way.
 - `api` instance: A pre-configures Axios instance with a base URL set from the environment configuration, It uses interceptors for handling requests and responses.
 - Repose handling: The response interceptor processes the response data or handles errors. It includes logic for handling authentication errors (e.g., redirecting to the login page on a 401 status).


Auth.tsx : 

This file managed the authentication logic, integrating with the React Query library to manage the authentication state.