/**
 * Shared between the server layout (inlined before paint) and the client
 * toggle, so a stored preference never flashes the wrong theme.
 */
export const THEME_KEY = "atelier-theme";

export const themeBootScript = `(function(){try{var m=localStorage.getItem("${THEME_KEY}");if(m==="light"||m==="dark"){document.documentElement.setAttribute("data-theme",m);}}catch(e){}})();`;
