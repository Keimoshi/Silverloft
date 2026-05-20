import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import './index.css'

const path = window.location.pathname;
const RootComponent = path === '/admin' ? AdminPage : App;

ReactDOM.createRoot(document.getElementById('root')).render(<RootComponent />)