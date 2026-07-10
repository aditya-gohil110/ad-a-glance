import { createGlobalStyle } from "styled-components";
import { theme } from "./theme";

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  html { color-scheme: dark; }
  body {
    margin: 0;
    background: ${theme.colors.bg};
    color: ${theme.colors.text};
    font-family: ${theme.font.body};
    -webkit-font-smoothing: antialiased;
  }
  button, input { font-family: inherit; }
  h1, h2, h3 { font-family: ${theme.font.display}; margin: 0; }
`;
