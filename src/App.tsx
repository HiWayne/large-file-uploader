import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createGlobalStyle } from "styled-components";
import Router from "./router";

const GlobalStyle = createGlobalStyle`
  :root {
    font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;

    color-scheme: light dark;
    color: rgba(255, 255, 255, 0.87);
    background-color: #242424;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;

    margin: 0 auto;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
  }
  a:hover {
    color: #535bf2;
  }

  body {
    margin: 0;
    display: flex;
    justify-content: center;
    place-items: center;
    min-width: 320px;
    min-height: 100vh;
  }

  h1 {
    font-size: 3.2em;
    line-height: 1.1;
  }

  button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #1a1a1a;
    cursor: pointer;
    transition: border-color 0.25s;
  }
  button:hover {
    border-color: #646cff;
  }
  button:focus,
  button:focus-visible {
    outline: 4px auto -webkit-focus-ring-color;
  }

  @media (prefers-color-scheme: light) {
    :root {
      color: #213547;
      background-color: #ffffff;
    }
    a:hover {
      color: #747bff;
    }
    button {
      background-color: #f9f9f9;
    }
  }

  .App {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
  }

  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.react:hover {
    filter: drop-shadow(0 0 2em #61dafbaa);
  }

  @keyframes logo-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    a:nth-of-type(2) .logo {
      animation: logo-spin infinite 20s linear;
    }
  }

  .card {
    padding: 1em 2em;
    width: 100px;
  }

  .read-the-docs {
    color: #888;
  }
`;

function App() {
  // let github pages support SPA
  const navigate = useNavigate();
  useEffect(() => {
    const path = localStorage.getItem("path");
    if (path) {
      localStorage.removeItem("path");
      navigate(path);
    }
  }, []);

  return (
    <>
      <GlobalStyle />
      <Router />
    </>
  );
}

export default App;
