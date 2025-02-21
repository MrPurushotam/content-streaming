import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import IndividualVideo from './pages/individualVideo';
import Login from './pages/login';
import Home from './pages/home';
import Layout from './components/layout/primary';
import AboutDev from './pages/aboutDev';
import History from './pages/History';
import UploadContent from './pages/UploadContent';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/toaster';
import PrimaryWrapper from './lib/PrimaryWrapper';
import EditVideo from './pages/editVideo';
import HideLogin from './components/outlet/HideLogin';
import IsAdminOutlet from './components/outlet/isAdminOutlet';

function App() {
  return (
    <>
      <Router>
        <PrimaryWrapper>
          <Routes>
            <Route element={<HideLogin />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/aboutdev" element={<Layout><AboutDev /></Layout>} />
            <Route path="/history" element={<Layout><History /></Layout>} />
            <Route path="/watch/:id" element={<Layout><IndividualVideo /></Layout>} />

            <Route element={<IsAdminOutlet />}>
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/upload" element={<Layout><UploadContent /></Layout>} />
              <Route path="/upload/edit/:id" element={<Layout><EditVideo /></Layout>} />
            </Route>

            <Route path="/*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </PrimaryWrapper>
      </Router>
      <Toaster />
    </>
  )
}

export default App
