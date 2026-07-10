import { Routes, Route, NavLink } from "react-router-dom";
import styled from "styled-components";
import { theme } from "./theme";
import Dashboard from "./pages/Dashboard";
import NetworkDetailPage from "./pages/NetworkDetailPage";

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${theme.font.display};
  font-weight: 700;
  font-size: 1.1rem;
`;

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${theme.colors.primary};
`;

const Nav = styled.nav`
  display: flex;
  gap: 0.25rem;
  background: ${theme.colors.bg};
  padding: 4px;
  border-radius: 999px;
`;

const NavItem = styled(NavLink)`
  text-decoration: none;
  color: ${theme.colors.textMuted};
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  transition: all 0.15s ease;

  &.active {
    background: ${theme.colors.surface};
    color: ${theme.colors.text};
    box-shadow: ${theme.shadow};
  }
`;

export default function App() {
  return (
    <div>
      <Header>
        <Brand><Dot />Ad a glance</Brand>
        <Nav>
          <NavItem to="/" end>Dashboard</NavItem>
          <NavItem to="/meta">Meta</NavItem>
          <NavItem to="/google">Google</NavItem>
          <NavItem to="/linkedin">LinkedIn</NavItem>
        </Nav>
      </Header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/meta" element={<NetworkDetailPage key="meta" network="meta" />} />
        <Route path="/google" element={<NetworkDetailPage key="google" network="google" />} />
        <Route path="/linkedin" element={<NetworkDetailPage key="linkedin" network="linkedin" />} />
      </Routes>
    </div>
  );
}
