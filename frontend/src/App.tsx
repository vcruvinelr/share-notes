import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Button, Typography, Space, Avatar, Dropdown, Switch, App as AntApp, theme as antdTheme } from 'antd';
import { LoginOutlined, LogoutOutlined, UserOutlined, MoonOutlined, SunOutlined, FileTextOutlined } from '@ant-design/icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import config from './config';
import { useState, useEffect } from 'react';

const { Header: AntHeader, Content } = Layout;
const { Title } = Typography;

const Header = () => {
  const { authenticated, user, login, logout, loading, isDarkMode, toggleTheme } = useAuth();

  if (loading) {
    return null;
  }

  const userMenuItems = authenticated
    ? [
        {
          key: 'user',
          label: user?.username || user?.email,
          icon: <UserOutlined />,
          disabled: true,
        },
        {
          key: 'logout',
          label: 'Logout',
          icon: <LogoutOutlined />,
          onClick: logout,
        },
      ]
    : [];

  return (
    <AntHeader style={{ 
      background: isDarkMode ? '#001529' : '#fff',
      padding: '0 24px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Space size="middle">
        <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        <Title level={3} style={{ margin: 0, color: isDarkMode ? '#fff' : '#1890ff' }}>
          SyncPad
        </Title>
      </Space>

      <Space size="large">
        <Space>
          <SunOutlined style={{ fontSize: '16px', color: isDarkMode ? '#fff' : '#000' }} />
          <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />
          <MoonOutlined style={{ fontSize: '16px', color: isDarkMode ? '#fff' : '#000' }} />
        </Space>

        {config.features.enableAuth && (
          <>
            {authenticated ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Avatar 
                  style={{ backgroundColor: '#1890ff', cursor: 'pointer' }} 
                  icon={<UserOutlined />}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={login}
              >
                Login
              </Button>
            )}
          </>
        )}
      </Space>
    </AntHeader>
  );
};

function AppRoutes() {
  const { isDarkMode } = useAuth();
  
  return (
    <Layout style={{ minHeight: '100vh', background: isDarkMode ? '#000000' : '#f0f2f5' }}>
      <Header />
      <Content style={{ 
        background: isDarkMode ? '#000000' : '#f0f2f5',
      }}>
        <AntApp>
          <Routes>
            <Route path="/" element={<NoteList />} />
            <Route path="/notes/:noteId" element={<NoteEditor />} />
            <Route path="/notes/shared/:shareToken" element={<NoteEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AntApp>
      </Content>
    </Layout>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // Apply global body styles based on theme
  useEffect(() => {
    if (isDarkMode) {
      document.body.style.backgroundColor = '#000000';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.backgroundColor = '#000000';
    } else {
      document.body.style.backgroundColor = '#f0f2f5';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.backgroundColor = '#f0f2f5';
    }
  }, [isDarkMode]);

  const { defaultAlgorithm, darkAlgorithm } = antdTheme;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AuthProvider isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
