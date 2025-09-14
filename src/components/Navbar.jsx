import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Compass, MessageCircle, MessageSquare, Menu, X, User, Home, Users, MapPin } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <Compass className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold">T-Connect</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
                >
                  <User className="w-4 h-4" />
                  <span>個人檔案</span>
                </button>
                <button
                  onClick={() => navigate('/chatrooms')}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>聊天室</span>
                </button>
                <button
                  onClick={() => navigate('/host')}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
                >
                  <Home className="w-4 h-4" />
                  <span>提供住宿</span>
                </button>
                <button
                  onClick={() => navigate('/companion')}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
                >
                  <Users className="w-4 h-4" />
                  <span>尋找旅伴</span>
                </button>
                <button
                  onClick={() => navigate('/local')}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
                >
                  <MapPin className="w-4 h-4" />
                  <span>成為地陪</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
              >
                <User className="w-4 h-4" />
                <span>登入</span>
              </button>
            )}
            
            {/* 意見回饋連結 - 所有用戶都可以看到 */}
            <button
              onClick={() => navigate('/feedback')}
              className="text-gray-600 hover:text-blue-600 flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              <span>意見回饋</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-blue-600 p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      closeMenu();
                    }}
                    className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
                  >
                    <User className="w-5 h-5" />
                    <span>個人檔案</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/chatrooms');
                      closeMenu();
                    }}
                    className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>聊天室</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/host');
                      closeMenu();
                    }}
                    className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
                  >
                    <Home className="w-5 h-5" />
                    <span>提供住宿</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/companion');
                      closeMenu();
                    }}
                    className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
                  >
                    <Users className="w-5 h-5" />
                    <span>尋找旅伴</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/local');
                      closeMenu();
                    }}
                    className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>成為地陪</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate('/login');
                    closeMenu();
                  }}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
                >
                  <User className="w-5 h-5" />
                  <span>登入</span>
                </button>
              )}
              
              {/* 意見回饋連結 - 所有用戶都可以看到 */}
              <button
                onClick={() => {
                  navigate('/feedback');
                  closeMenu();
                }}
                className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 px-3 py-3 rounded-md text-lg font-medium w-full text-left"
              >
                <MessageSquare className="w-5 h-5" />
                <span>意見回饋</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 