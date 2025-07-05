import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExchangePlatform from './pages/home/ExchangePlatform.jsx';
import HostRegistration from './pages/host/HostRegistration.jsx';
import CompanionSearch from './pages/companion/CompanionSearch.jsx';
import LocalRegistration from './pages/local/LocalRegistration.jsx';
import Profile from './pages/profile/Profile.jsx';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Chatroom from './pages/chatroom/Chatroom.jsx';
import ChatroomList from './pages/chatroom/ChatroomList.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExchangePlatform />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* 保護頁面：只有登入用戶才能進入 */}
        <Route
          path="/host"
          element={
            <PrivateRoute>
              <HostRegistration />
            </PrivateRoute>
          }
        />
        <Route
          path="/couch/:id/edit"
          element={
            <PrivateRoute>
              <HostRegistration />
            </PrivateRoute>
          }
        />
        <Route
          path="/companion"
          element={
            <PrivateRoute>
              <CompanionSearch />
            </PrivateRoute>
          }
        />
        <Route
          path="/companion/:id/edit"
          element={
            <PrivateRoute>
              <CompanionSearch />
            </PrivateRoute>
          }
        />
        <Route
          path="/local"
          element={
            <PrivateRoute>
              <LocalRegistration />
            </PrivateRoute>
          }
        />
        <Route
          path="/local/:id/edit"
          element={
            <PrivateRoute>
              <LocalRegistration />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/chatrooms"
          element={
            <PrivateRoute>
              <ChatroomList />
            </PrivateRoute>
          }
        />
        <Route 
          path="/chatroom/:chatroomId" 
          element={
            <PrivateRoute>
              <Chatroom />
            </PrivateRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
