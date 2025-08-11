import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Compass, MessageCircle, MessageSquare } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <nav className="bg-white shadow-sm p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <Compass className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold">T-Connect</span>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="text-gray-600 hover:text-blue-600"
              >
                個人檔案
              </button>
              <button
                onClick={() => navigate('/chatrooms')}
                className="text-gray-600 hover:text-blue-600 flex items-center space-x-1"
              >
                <MessageCircle className="w-4 h-4" />
                <span>聊天室</span>
              </button>
              <button
                onClick={() => navigate('/host')}
                className="text-gray-600 hover:text-blue-600"
              >
                提供住宿
              </button>
              <button
                onClick={() => navigate('/companion')}
                className="text-gray-600 hover:text-blue-600"
              >
                尋找旅伴
              </button>
              <button
                onClick={() => navigate('/local')}
                className="text-gray-600 hover:text-blue-600"
              >
                成為地陪
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-gray-600 hover:text-blue-600"
            >
              登入
            </button>
          )}
          
          {/* 意見回饋連結 - 所有用戶都可以看到 */}
          <button
            onClick={() => navigate('/feedback')}
            className="text-gray-600 hover:text-blue-600 flex items-center space-x-1"
          >
            <MessageSquare className="w-4 h-4" />
            <span>意見回饋</span>
          </button>
        </div>
      </div>
    </nav>
  );
} 